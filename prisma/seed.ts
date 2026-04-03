import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'macbidsu';
  const password = 'topsecret';
  const firstName = 'Mac';
  const lastName = 'Bid';

  // Check if admin already exists
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
  console.log('Password:', password);
  console.log('─────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());