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

  // Seed Plans (Entrante, Plato Fuerte, Banquete)
  type PlanSeed = {
    code: string;
    name: string;
    description?: string | null;
    monthlyPrice: string; // Prisma Decimal as string
    features: string[];
    isActive: boolean;
  };
  const plans: Array<PlanSeed> = [
    {
      code: 'ENTRANTE',
      name: 'Entrante',
      description: 'Plan básico con prueba gratuita de 14 días',
      monthlyPrice: '19.00',
      features: [
        'Hasta 1 restaurante',
        'Hasta 5 usuarios',
        'Menús, secciones e ítems ilimitados',
        'Gestión de órdenes completa',
        'Soporte por email',
        'Branding básico',
      ],
      isActive: true,
    },
    {
      code: 'PLATO_FUERTE',
      name: 'Plato Fuerte',
      description: 'Plan intermedio para crecimiento',
      monthlyPrice: '49.00',
      features: [
        'Hasta 3 restaurantes',
        'Hasta 20 usuarios',
        'Roles y permisos avanzados',
        'Exportaciones (CSV/PDF)',
        'Analíticas básicas y reportes programados',
        'Soporte estándar',
      ],
      isActive: true,
    },
    {
      code: 'BANQUETE',
      name: 'Banquete',
      description: 'Plan para alto volumen y múltiples ubicaciones',
      monthlyPrice: '99.00',
      features: [
        'Restaurantes y usuarios ilimitados',
        'Analíticas avanzadas y panel ejecutivo',
        'Branding/tema personalizado y subdominio propio',
        'Integraciones (API/Webhooks/SSO — futuro)',
        'Soporte prioritario',
      ],
      isActive: true,
    },
  ];

  for (const p of plans) {
    // Access via any to avoid type errors before `prisma generate`
    await (prisma as any).plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        description: p.description,
        monthlyPrice: p.monthlyPrice,
        features: p.features,
        isActive: p.isActive,
      },
      create: p,
    });
  }
  console.log('Seed: ensured default plans (ENTRANTE, PLATO_FUERTE, BANQUETE)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
