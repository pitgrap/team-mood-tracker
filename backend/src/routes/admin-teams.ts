import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

function paramId(req: Request): string {
  return req.params.id as string;
}

const teamsRouter = Router();

// GET /api/admin/teams
teamsRouter.get('/teams', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const perPage = parseInt(req.query.perPage as string) || 25;
  const skip = (page - 1) * perPage;

  const [data, total] = await Promise.all([
    prisma.team.findMany({
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.team.count(),
  ]);

  res.json({ data, total });
});

// GET /api/admin/teams/:id/dashboard — team detail dashboard with trends
teamsRouter.get('/teams/:id/dashboard', async (req: Request, res: Response) => {
  const teamId = paramId(req);
  const team = await prisma.team.findUnique({ where: { id: teamId } });

  if (!team) {
    res.status(404).json({ error: 'Team not found', code: 'TEAM_NOT_FOUND' });
    return;
  }

  const questions = await prisma.question.findMany({ orderBy: { order: 'asc' } });

  // Get all surveys for this team, ordered by creation date
  const surveys = await prisma.survey.findMany({
    where: { teamId },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { submissions: true } },
    },
  });

  // Fetch all responses for this team's surveys at once
  const surveyIds = surveys.map((s) => s.id);
  const allResponses = await prisma.response.findMany({
    where: { surveyId: { in: surveyIds } },
  });

  // Build per-survey breakdown with averages per question
  const surveyBreakdown = surveys.map((s) => {
    const surveyResponses = allResponses.filter((r) => r.surveyId === s.id);

    const questionResults = questions.map((q) => {
      const scores = surveyResponses.filter((r) => r.questionId === q.id).map((r) => r.score);
      scores.sort((a, b) => a - b);

      const average =
        scores.length > 0
          ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
          : 0;

      let median = 0;
      if (scores.length > 0) {
        const mid = Math.floor(scores.length / 2);
        median =
          scores.length % 2 !== 0
            ? scores[mid]
            : parseFloat(((scores[mid - 1] + scores[mid]) / 2).toFixed(2));
      }

      return {
        questionId: q.id,
        questionLabel: q.label,
        average,
        median,
        scores,
      };
    });

    return {
      surveyId: s.id,
      sprintLabel: s.sprintLabel,
      status: s.status,
      expectedParticipants: s.expectedParticipants,
      submissionCount: s._count.submissions,
      createdAt: s.createdAt,
      closedAt: s.closedAt,
      questionResults,
    };
  });

  // Compute overall team averages (closed surveys only)
  const closedIds = surveys.filter((s) => s.status === 'CLOSED').map((s) => s.id);
  const closedResponses = allResponses.filter((r) => closedIds.includes(r.surveyId));

  const overallAverages = questions.map((q) => {
    const scores = closedResponses.filter((r) => r.questionId === q.id).map((r) => r.score);
    const average =
      scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;
    return {
      questionId: q.id,
      questionLabel: q.label,
      average,
      totalResponses: scores.length,
    };
  });

  // Compute trend data: per-question average across closed surveys in chronological order
  const closedSurveys = surveyBreakdown.filter((s) => s.status === 'CLOSED');
  const trends = questions.map((q) => ({
    questionId: q.id,
    questionLabel: q.label,
    dataPoints: closedSurveys.map((s) => {
      const qr = s.questionResults.find((r) => r.questionId === q.id);
      return {
        sprintLabel: s.sprintLabel,
        average: qr?.average ?? 0,
        closedAt: s.closedAt,
      };
    }),
  }));

  res.json({
    team: { id: team.id, name: team.name, createdAt: team.createdAt },
    totalSurveys: surveys.length,
    openSurveys: surveys.filter((s) => s.status === 'OPEN').length,
    closedSurveys: closedIds.length,
    totalResponses: allResponses.length,
    overallAverages,
    trends,
    surveys: surveyBreakdown,
  });
});

// GET /api/admin/teams/:id
teamsRouter.get('/teams/:id', async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({ where: { id: paramId(req) } });

  if (!team) {
    res.status(404).json({ error: 'Team not found', code: 'TEAM_NOT_FOUND' });
    return;
  }

  res.json(team);
});

// POST /api/admin/teams
teamsRouter.post('/teams', async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Team name is required', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    const team = await prisma.team.create({ data: { name: name.trim() } });
    res.status(201).json(team);
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'Team name already exists', code: 'DUPLICATE_TEAM' });
      return;
    }
    throw err;
  }
});

// PATCH /api/admin/teams/:id
teamsRouter.patch('/teams/:id', async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Team name is required', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    const team = await prisma.team.update({
      where: { id: paramId(req) },
      data: { name: name.trim() },
    });
    res.json(team);
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'Team name already exists', code: 'DUPLICATE_TEAM' });
      return;
    }
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ error: 'Team not found', code: 'TEAM_NOT_FOUND' });
      return;
    }
    throw err;
  }
});

// DELETE /api/admin/teams/:id
teamsRouter.delete('/teams/:id', async (req: Request, res: Response) => {
  // Check if team has surveys
  const surveyCount = await prisma.survey.count({ where: { teamId: paramId(req) } });

  if (surveyCount > 0) {
    res.status(409).json({
      error: 'Team cannot be deleted because it has surveys',
      code: 'TEAM_HAS_SURVEYS',
    });
    return;
  }

  try {
    await prisma.team.delete({ where: { id: paramId(req) } });
    res.status(204).send();
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ error: 'Team not found', code: 'TEAM_NOT_FOUND' });
      return;
    }
    throw err;
  }
});

export default teamsRouter;

