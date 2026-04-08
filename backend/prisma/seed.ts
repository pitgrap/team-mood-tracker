import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Missing required environment variables: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set to seed the admin account.',
    );
  }

  // Seed Question 1: Sprint Satisfaction
  await prisma.question.upsert({
    where: { order: 1 },
    update: {},
    create: {
      label: 'How satisfied are you with the sprint result?',
      order: 1,
    },
  });

  // Seed Question 2: Personal Mood
  await prisma.question.upsert({
    where: { order: 2 },
    update: {},
    create: {
      label: 'How do you feel?',
      order: 2,
    },
  });

  // Seed default Admin account
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
    },
  });

  console.log('✅ Seed complete: 2 questions + 1 admin account');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
