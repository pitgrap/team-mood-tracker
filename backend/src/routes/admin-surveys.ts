import { Router, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';

function paramId(req: Request): string {
  return req.params.id as string;
}

export function createAdminSurveysRouter(
  surveyTokenSecret: string,
  surveyTokenExpiry: string,
  frontendUrl: string,
) {
  const router = Router();

  // GET /api/admin/surveys
  router.get('/surveys', async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 25;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      prisma.survey.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          team: { select: { name: true } },
          _count: { select: { submissions: true } },
        },
      }),
      prisma.survey.count(),
    ]);

    const mapped = data.map((s) => ({
      id: s.id,
      sprintLabel: s.sprintLabel,
      expectedParticipants: s.expectedParticipants,
      status: s.status,
      teamId: s.teamId,
      teamName: s.team.name,
      submissionCount: s._count.submissions,
      createdAt: s.createdAt,
      closedAt: s.closedAt,
      participantUrl: `${frontendUrl}/survey/${s.token}`,
    }));

    res.json({ data: mapped, total });
  });

  // GET /api/admin/surveys/:id
  router.get('/surveys/:id', async (req: Request, res: Response) => {
    const survey = await prisma.survey.findUnique({
      where: { id: paramId(req) },
      include: {
        team: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!survey) {
      res.status(404).json({ error: 'Survey not found', code: 'SURVEY_NOT_FOUND' });
      return;
    }

    res.json({
      id: survey.id,
      sprintLabel: survey.sprintLabel,
      expectedParticipants: survey.expectedParticipants,
      status: survey.status,
      teamId: survey.teamId,
      teamName: survey.team.name,
      submissionCount: survey._count.submissions,
      createdAt: survey.createdAt,
      closedAt: survey.closedAt,
      participantUrl: `${frontendUrl}/survey/${survey.token}`,
    });
  });

  // POST /api/admin/surveys
  router.post('/surveys', async (req: Request, res: Response) => {
    const { teamId, sprintLabel, expectedParticipants } = req.body;

    if (!teamId || !sprintLabel || !expectedParticipants) {
      res.status(400).json({
        error: 'teamId, sprintLabel, and expectedParticipants are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (typeof expectedParticipants !== 'number' || expectedParticipants < 1) {
      res.status(400).json({
        error: 'expectedParticipants must be a positive number',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ error: 'Team not found', code: 'TEAM_NOT_FOUND' });
      return;
    }

    // Generate survey token
    const expiryMatch = surveyTokenExpiry.match(/^(\d+)(s|m|h|d)$/);
    let expirySeconds = 7 * 86400; // default 7 days
    if (expiryMatch) {
      const val = parseInt(expiryMatch[1], 10);
      const unit = expiryMatch[2];
      switch (unit) {
        case 's':
          expirySeconds = val;
          break;
        case 'm':
          expirySeconds = val * 60;
          break;
        case 'h':
          expirySeconds = val * 3600;
          break;
        case 'd':
          expirySeconds = val * 86400;
          break;
      }
    }

    // Create a placeholder ID first, then use it in the token
    const surveyId = crypto.randomUUID();

    const tokenOptions: SignOptions = { expiresIn: expirySeconds };
    const token = jwt.sign({ surveyId }, surveyTokenSecret, tokenOptions);

    try {
      const survey = await prisma.survey.create({
        data: {
          id: surveyId,
          sprintLabel: sprintLabel.trim(),
          expectedParticipants,
          teamId,
          token,
        },
      });

      res.status(201).json({
        ...survey,
        participantUrl: `${frontendUrl}/survey/${survey.token}`,
      });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        res.status(409).json({
          error: 'Sprint label already used for this team',
          code: 'DUPLICATE_SPRINT',
        });
        return;
      }
      throw err;
    }
  });

  // PATCH /api/admin/surveys/:id/close
  router.patch('/surveys/:id/close', async (req: Request, res: Response) => {
    const survey = await prisma.survey.findUnique({ where: { id: paramId(req) } });

    if (!survey) {
      res.status(404).json({ error: 'Survey not found', code: 'SURVEY_NOT_FOUND' });
      return;
    }

    if (survey.status === 'CLOSED') {
      res.status(400).json({ error: 'Survey is already closed', code: 'SURVEY_CLOSED' });
      return;
    }

    const updated = await prisma.survey.update({
      where: { id: paramId(req) },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    res.json(updated);
  });

  return router;
}

