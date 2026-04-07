import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';

export function createParticipantRouter(surveyTokenSecret: string) {
  const router = Router();

  // Helper: verify survey token and return surveyId
  function verifyToken(token: string): { surveyId: string } {
    try {
      const decoded = jwt.verify(token, surveyTokenSecret) as { surveyId: string };
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw { status: 401, code: 'TOKEN_EXPIRED', error: 'This survey link has expired' };
      }
      throw { status: 404, code: 'SURVEY_NOT_FOUND', error: 'Invalid survey link' };
    }
  }

  // GET /api/surveys/:token — Load survey + questions
  router.get('/surveys/:token', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    let surveyId: string;
    try {
      const decoded = verifyToken(token);
      surveyId = decoded.surveyId;
    } catch (err: unknown) {
      const e = err as { status: number; code: string; error: string };
      res.status(e.status).json({ error: e.error, code: e.code });
      return;
    }

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        team: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!survey) {
      res.status(404).json({ error: 'Survey not found', code: 'SURVEY_NOT_FOUND' });
      return;
    }

    const questions = await prisma.question.findMany({ orderBy: { order: 'asc' } });

    // Check if this participant has already submitted (participantId sent as query param)
    let alreadySubmitted = false;
    const participantId = req.query.participantId as string | undefined;
    if (participantId) {
      const tokenHash = crypto.createHash('sha256').update(participantId).digest('hex');
      const existingSubmission = await prisma.submission.findUnique({
        where: { surveyId_tokenHash: { surveyId, tokenHash } },
      });
      alreadySubmitted = !!existingSubmission;
    }

    res.json({
      id: survey.id,
      sprintLabel: survey.sprintLabel,
      teamName: survey.team.name,
      status: survey.status,
      expectedParticipants: survey.expectedParticipants,
      submissionCount: survey._count.submissions,
      alreadySubmitted,
      questions: questions.map((q) => ({
        id: q.id,
        label: q.label,
        order: q.order,
      })),
    });
  });

  // POST /api/surveys/:token/responses — Submit responses
  router.post('/surveys/:token/responses', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    let surveyId: string;
    try {
      const decoded = verifyToken(token);
      surveyId = decoded.surveyId;
    } catch (err: unknown) {
      const e = err as { status: number; code: string; error: string };
      res.status(e.status).json({ error: e.error, code: e.code });
      return;
    }

    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      res.status(404).json({ error: 'Survey not found', code: 'SURVEY_NOT_FOUND' });
      return;
    }

    if (survey.status === 'CLOSED') {
      res.status(409).json({ error: 'Survey is already closed', code: 'SURVEY_CLOSED' });
      return;
    }

    // Check duplicate submission using participantId
    const { responses, participantId } = req.body;

    if (!participantId || typeof participantId !== 'string') {
      res.status(400).json({
        error: 'participantId is required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(participantId).digest('hex');
    const existingSubmission = await prisma.submission.findUnique({
      where: { surveyId_tokenHash: { surveyId, tokenHash } },
    });
    if (existingSubmission) {
      res.status(409).json({ error: 'You have already submitted', code: 'ALREADY_SUBMITTED' });
      return;
    }

    // Validate responses
    if (!Array.isArray(responses) || responses.length === 0) {
      res.status(400).json({ error: 'Responses are required', code: 'VALIDATION_ERROR' });
      return;
    }

    const questions = await prisma.question.findMany();
    const questionIds = new Set(questions.map((q) => q.id));

    for (const r of responses) {
      if (!r.questionId || !questionIds.has(r.questionId)) {
        res.status(400).json({ error: 'Invalid questionId', code: 'VALIDATION_ERROR' });
        return;
      }
      if (typeof r.score !== 'number' || r.score < 1 || r.score > 10) {
        res.status(400).json({
          error: 'Score must be a number between 1 and 10',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
    }

    // Save responses + submission in a transaction
    await prisma.$transaction([
      ...responses.map((r: { questionId: string; score: number }) =>
        prisma.response.create({
          data: {
            surveyId,
            questionId: r.questionId,
            score: r.score,
          },
        }),
      ),
      prisma.submission.create({
        data: { surveyId, tokenHash },
      }),
    ]);

    // Check if auto-close needed
    const submissionCount = await prisma.submission.count({ where: { surveyId } });

    if (submissionCount >= survey.expectedParticipants) {
      await prisma.survey.update({
        where: { id: surveyId },
        data: { status: 'CLOSED', closedAt: new Date() },
      });

      // Return results directly on auto-close
      const results = await getResults(surveyId);
      res.status(201).json({ autoClosed: true, results });
      return;
    }

    res.status(201).json({ autoClosed: false });
  });

  // GET /api/surveys/:token/results — Get results
  router.get('/surveys/:token/results', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    let surveyId: string;
    try {
      const decoded = verifyToken(token);
      surveyId = decoded.surveyId;
    } catch (err: unknown) {
      const e = err as { status: number; code: string; error: string };
      res.status(e.status).json({ error: e.error, code: e.code });
      return;
    }

    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      res.status(404).json({ error: 'Survey not found', code: 'SURVEY_NOT_FOUND' });
      return;
    }

    if (survey.status !== 'CLOSED') {
      res.status(403).json({ error: 'Results are not ready yet', code: 'RESULTS_NOT_READY' });
      return;
    }

    const results = await getResults(surveyId);
    res.json(results);
  });

  return router;
}

async function getResults(surveyId: string) {
  const questions = await prisma.question.findMany({ orderBy: { order: 'asc' } });
  const responses = await prisma.response.findMany({ where: { surveyId } });

  return questions.map((q) => {
    const scores = responses.filter((r) => r.questionId === q.id).map((r) => r.score);
    scores.sort((a, b) => a - b);

    const average = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0;

    let median = 0;
    if (scores.length > 0) {
      const mid = Math.floor(scores.length / 2);
      median = scores.length % 2 !== 0 ? scores[mid] : parseFloat(((scores[mid - 1] + scores[mid]) / 2).toFixed(2));
    }

    return {
      questionId: q.id,
      questionLabel: q.label,
      average,
      median,
      scores,
    };
  });
}

