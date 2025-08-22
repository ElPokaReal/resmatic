import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as spec from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Restaurants & Staff E2E', () => {
  let app: INestApplication<spec.App>;
  let prisma: PrismaClient;

  const base = '/api/v1';
  const authBase = `${base}/auth`;
  const restaurantsBase = `${base}/restaurants`;
  const invitesBase = `${base}/invites`;

  // Seeded admin from prisma/seed.ts
  const adminEmail = 'admin@resmatic.local';
  const adminPassword = 'password123';

  // Test user who will be invited
  const staffEmail = 'waiter@resmatic.local';
  const staffPassword = 'pass1234!';

  let adminAccess = '';
  let staffAccess = '';
  let restaurantId = '';
  let inviteToken = '';
  let staffUserId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = new PrismaClient();
    // Ensure staff user exists with known password
    const passwordHash = await bcrypt.hash(staffPassword, 10);
    const existing = await prisma.user.findUnique({ where: { email: staffEmail } });
    if (!existing) {
      const created = await prisma.user.create({
        data: { email: staffEmail, name: 'Waiter One', passwordHash, role: 'USER' as any },
      });
      staffUserId = created.id;
    } else {
      await prisma.user.update({ where: { email: staffEmail }, data: { passwordHash } });
      staffUserId = existing.id;
    }
  });

  afterAll(async () => {
    try {
      if (restaurantId) {
        // Clean related records
        await prisma.staffInvite.deleteMany({ where: { restaurantId } });
        await prisma.restaurantMember.deleteMany({ where: { restaurantId } });
        await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => void 0);
      }
      // Remove test staff user
      if (staffUserId) {
        await prisma.refreshToken.deleteMany({ where: { userId: staffUserId } }).catch(() => void 0);
        await prisma.user.delete({ where: { id: staffUserId } }).catch(() => void 0);
      }
    } finally {
      await prisma.$disconnect();
      await app.close();
    }
  });

  it('auth: login as admin', async () => {
    const res = await request(app.getHttpServer())
      .post(`${authBase}/login`)
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    expect(res.body).toHaveProperty('accessToken');
    adminAccess = res.body.accessToken;
  });

  it('restaurants: create', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'My Test Restaurant' })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    restaurantId = res.body.id;
  });

  it('restaurants: invite staff as WAITER', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/invites`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ email: staffEmail, tenantRole: 'WAITER' })
      .expect(201);
    expect(res.body).toHaveProperty('token');
    inviteToken = res.body.token;
  });

  it('auth: login as invited staff', async () => {
    const res = await request(app.getHttpServer())
      .post(`${authBase}/login`)
      .send({ email: staffEmail, password: staffPassword })
      .expect(200);
    expect(res.body).toHaveProperty('accessToken');
    staffAccess = res.body.accessToken;
    // capture user id for later role update/removal
    expect(res.body).toHaveProperty('user');
    staffUserId = res.body.user.id;
  });

  it('invites: accept invite as staff', async () => {
    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: inviteToken })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toHaveProperty('restaurantId', restaurantId);
      });
  });

  it('restaurants: list members should include staff as WAITER', async () => {
    const res = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/members`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    const members = res.body as Array<any>;
    const found = members.find((m) => m.userId === staffUserId);
    expect(found).toBeTruthy();
    expect(found.tenantRole).toBe('WAITER');
  });

  it('restaurants: owner updates staff role to MANAGER', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${restaurantsBase}/${restaurantId}/members/${staffUserId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tenantRole: 'MANAGER' })
      .expect(200);
    expect(res.body).toHaveProperty('tenantRole', 'MANAGER');
  });

  it('restaurants: owner removes staff member', async () => {
    await request(app.getHttpServer())
      .delete(`${restaurantsBase}/${restaurantId}/members/${staffUserId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200)
      .expect(({ body }) => expect(body).toHaveProperty('ok', true));
  });

  it('restaurants: list members should no longer include staff', async () => {
    const res = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/members`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    const members = res.body as Array<any>;
    const found = members.find((m) => m.userId === staffUserId);
    expect(found).toBeFalsy();
  });
});
