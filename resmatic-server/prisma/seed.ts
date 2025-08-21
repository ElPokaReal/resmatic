import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@resmatic.local'.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log('Seed: created admin user', adminEmail);
  } else {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
      console.log('Seed: updated admin user role to ADMIN');
    } else {
      console.log('Seed: admin user already exists with ADMIN role, skipping');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
