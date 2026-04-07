import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const adminDashboardRouter = Router();

// GET /api/admin/dashboard — aggregate stats for the admin dashboard
adminDashboardRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const [teamCount, surveyCount, openSurveys, closedSurveys, responseCount, recentSurveys] =
    await Promise.all([
      prisma.team.count(),
      prisma.survey.count(),
      prisma.survey.count({ where: { status: 'OPEN' } }),
      prisma.survey.count({ where: { status: 'CLOSED' } }),
      prisma.response.count(),
      prisma.survey.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          team: { select: { name: true } },
          _count: { select: { submissions: true } },
        },
      }),
    ]);

  // Per-question averages across ALL closed surveys
  const questions = await prisma.question.findMany({ orderBy: { order: 'asc' } });
  const allResponses = await prisma.response.findMany({
    where: { survey: { status: 'CLOSED' } },
  });

  const questionStats = questions.map((q) => {
    const scores = allResponses.filter((r) => r.questionId === q.id).map((r) => r.score);
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

  // Per-team averages (across all closed surveys for each team)
  const teams = await prisma.team.findMany({
    include: {
      surveys: {
        where: { status: 'CLOSED' },
        select: { id: true },
      },
    },
  });

  const teamStats = await Promise.all(
    teams.map(async (team) => {
      const surveyIds = team.surveys.map((s) => s.id);
      if (surveyIds.length === 0) {
        return {
          teamId: team.id,
          teamName: team.name,
          closedSurveys: 0,
          questionAverages: questions.map((q) => ({
            questionLabel: q.label,
            average: 0,
            totalResponses: 0,
          })),
        };
      }

      const teamResponses = await prisma.response.findMany({
        where: { surveyId: { in: surveyIds } },
      });

      return {
        teamId: team.id,
        teamName: team.name,
        closedSurveys: surveyIds.length,
        questionAverages: questions.map((q) => {
          const scores = teamResponses.filter((r) => r.questionId === q.id).map((r) => r.score);
          const average =
            scores.length > 0
              ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
              : 0;
          return {
            questionLabel: q.label,
            average,
            totalResponses: scores.length,
          };
        }),
      };
    }),
  );

  res.json({
    teamCount,
    surveyCount,
    openSurveys,
    closedSurveys,
    responseCount,
    questionStats,
    teamStats,
    recentSurveys: recentSurveys.map((s) => ({
      id: s.id,
      sprintLabel: s.sprintLabel,
      teamName: s.team.name,
      status: s.status,
      submissionCount: s._count.submissions,
      expectedParticipants: s.expectedParticipants,
      createdAt: s.createdAt,
      closedAt: s.closedAt,
    })),
  });
});

export default adminDashboardRouter;

