import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const firstName = 'Mac';
  const lastName = 'Bid';

  if (!username || !password) {
    throw new Error(
      'ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables before seeding.',
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    console.log('Admin account already exists. Skipping seed.');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      password: hashed,
      firstName,
      lastName,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('─────────────────────────────────');
  console.log('Admin account created successfully');
  console.log('Username:', username);
  console.log('─────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());