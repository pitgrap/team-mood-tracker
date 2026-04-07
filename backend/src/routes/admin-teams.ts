import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

function paramId(req: Request): string {
  return paramId(req) as string;
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

