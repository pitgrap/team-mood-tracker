import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSampleData() {
  // Get questions
  const questions = await prisma.question.findMany({ orderBy: { order: 'asc' } });
  console.log(`Found ${questions.length} questions`);

  // Get surveys for Engineering Alpha
  const surveys = await prisma.survey.findMany({
    where: { team: { name: 'Engineering Alpha' } },
    orderBy: { sprintLabel: 'asc' },
  });
  console.log(`Found ${surveys.length} surveys`);

  // Submit 3 responses to the first 7 surveys (auto-closes them since expectedParticipants=3)
  for (let si = 0; si < Math.min(7, surveys.length); si++) {
    const survey = surveys[si];

    for (let p = 0; p < 3; p++) {
      const participantId = `seed-participant-${si}-${p}`;
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(participantId).digest('hex');

      // Create responses
      for (const q of questions) {
        // Vary scores: trending upward over sprints with some randomness
        const baseScore = Math.min(10, Math.max(1, 4 + si * 0.5 + Math.floor(Math.random() * 4)));
        await prisma.response.create({
          data: {
            surveyId: survey.id,
            questionId: q.id,
            score: baseScore,
          },
        });
      }

      // Create submission
      await prisma.submission.create({
        data: { surveyId: survey.id, tokenHash },
      });
    }

    // Close the survey
    await prisma.survey.update({
      where: { id: survey.id },
      data: { status: 'CLOSED', closedAt: new Date(Date.now() - (7 - si) * 7 * 86400000) },
    });

    console.log(`  ${survey.sprintLabel}: 3 submissions, CLOSED`);
  }

  // Leave surveys 8-10 open with partial/no submissions
  if (surveys.length > 7) {
    // Survey 8: 1 submission
    const s8 = surveys[7];
    const crypto = await import('crypto');
    const hash8 = crypto.createHash('sha256').update('seed-partial-8').digest('hex');
    for (const q of questions) {
      await prisma.response.create({
        data: { surveyId: s8.id, questionId: q.id, score: 7 },
      });
    }
    await prisma.submission.create({ data: { surveyId: s8.id, tokenHash: hash8 } });
    console.log(`  ${s8.sprintLabel}: 1 submission, OPEN`);
  }

  // Surveys 9-10: no submissions (stay open)
  for (let si = 8; si < surveys.length; si++) {
    console.log(`  ${surveys[si].sprintLabel}: 0 submissions, OPEN`);
  }

  console.log('\n✅ Sample data seeded');
}

seedSampleData()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

