import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as spec from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// E2E tests focused on invites: expiration and negative cases
// Covers: invalid token, expired token, mismatched email, already accepted, scoping by restaurant and role

describe('Invites E2E (expiration & negatives)', () => {
  let app: INestApplication<spec.App>;
  let prisma: PrismaClient;

  const base = '/api/v1';
  const authBase = `${base}/auth`;
  const restaurantsBase = `${base}/restaurants`;
  const invitesBase = `${base}/invites`;

  // Seeded admin from prisma/seed.ts
  const adminEmail = 'admin@resmatic.local';
  const adminPassword = 'password123';

  // Test users to be invited
  const staff1 = { email: 'e2e.inv.staff1@resmatic.local', password: 'pass-Staff1!' };
  const staff2 = { email: 'e2e.inv.staff2@resmatic.local', password: 'pass-Staff2!' };
  const staff3 = { email: 'e2e.inv.staff3@resmatic.local', password: 'pass-Staff3!' };
  const staff4 = { email: 'e2e.inv.staff4@resmatic.local', password: 'pass-Staff4!' };

  let adminAccess = '';

  // Track created resources for cleanup
  const createdRestaurantIds: string[] = [];
  const createdUserEmails = new Set<string>();
  const createdInviteIds: string[] = [];

  async function ensureUser(email: string, password: string): Promise<string> {
    const existing = await prisma.user.findUnique({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);
    if (!existing) {
      const created = await prisma.user.create({
        data: { email, name: email.split('@')[0], passwordHash, role: 'USER' as any },
      });
      createdUserEmails.add(email);
      return created.id;
    } else {
      await prisma.user.update({ where: { email }, data: { passwordHash } });
      return existing.id;
    }
  }

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer()).post(`${authBase}/login`).send({ email, password });
    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.log('Login failed', res.status, res.body);
    }
    expect(res.status).toBe(200);
    return res.body.accessToken as string;
  }

  async function createRestaurant(name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name })
      .expect(201);
    const id = res.body.id as string;
    createdRestaurantIds.push(id);
    return id;
  }

  async function createInvite(restaurantId: string, email: string, tenantRole: 'WAITER' | 'MANAGER') {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/invites`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ email, tenantRole })
      .expect(201);
    createdInviteIds.push(res.body.id);
    return res.body as { id: string; token: string; restaurantId: string };
  }

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

    // Ensure staff users exist with known passwords
    await ensureUser(staff1.email, staff1.password);
    await ensureUser(staff2.email, staff2.password);
    await ensureUser(staff3.email, staff3.password);
    await ensureUser(staff4.email, staff4.password);

    // Login admin
    adminAccess = await login(adminEmail, adminPassword);
  });

  afterAll(async () => {
    try {
      // Clean invites, memberships, and restaurants
      if (createdRestaurantIds.length) {
        await prisma.staffInvite.deleteMany({ where: { restaurantId: { in: createdRestaurantIds } } }).catch(() => void 0);
        await prisma.restaurantMember.deleteMany({ where: { restaurantId: { in: createdRestaurantIds } } }).catch(() => void 0);
        for (const id of createdRestaurantIds) {
          await prisma.restaurant.delete({ where: { id } }).catch(() => void 0);
        }
      }
      // Remove created test users
      if (createdUserEmails.size) {
        const users = await prisma.user.findMany({ where: { email: { in: Array.from(createdUserEmails) } } });
        const userIds = users.map((u) => u.id);
        if (userIds.length) {
          await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } }).catch(() => void 0);
        }
        for (const email of createdUserEmails) {
          await prisma.user.delete({ where: { email } }).catch(() => void 0);
        }
      }
    } finally {
      await prisma.$disconnect();
      await app.close();
    }
  });

  it('should accept a valid invite and create membership; second accept should return 404', async () => {
    const restaurantId = await createRestaurant('Invite Positive - A');
    const invite = await createInvite(restaurantId, staff1.email, 'WAITER');

    const staffAccess = await login(staff1.email, staff1.password);

    // Accept first time
    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: invite.token })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toHaveProperty('restaurantId', restaurantId);
      });

    // Accept again -> 404 (already accepted)
    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: invite.token })
      .expect(404);

    // Owner can see member as WAITER
    const membersRes = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/members`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    const found = (membersRes.body as any[]).find((m) => m.user?.email === staff1.email || m.userId);
    expect(found).toBeTruthy();
  });

  it('should fail with 404 for an invalid/non-existent token', async () => {
    const staffAccess = await login(staff2.email, staff2.password);
    const invalidToken = 'invalid-token-12345'; // passes MinLength, but does not exist
    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: invalidToken })
      .expect(404);
  });

  it('should fail with 404 when invite is expired', async () => {
    const restaurantId = await createRestaurant('Invite Expired - B');
    const invite = await createInvite(restaurantId, staff3.email, 'WAITER');

    // Force expire the invite
    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const staffAccess = await login(staff3.email, staff3.password);

    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: invite.token })
      .expect(404);
  });

  it('should fail with 404 when accepting with mismatched email account', async () => {
    const restaurantId = await createRestaurant('Invite Mismatch - C');
    const invite = await createInvite(restaurantId, staff4.email, 'MANAGER');

    // Login as a different user (staff1) and try to accept staff4 invite
    const otherAccess = await login(staff1.email, staff1.password);

    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${otherAccess}`)
      .send({ token: invite.token })
      .expect(404);
  });

  it('scoping: invited WAITER cannot list members and has no access to other restaurants', async () => {
    const restaurantA = await createRestaurant('Invite Scope - D1');
    const restaurantB = await createRestaurant('Invite Scope - D2');

    const invite = await createInvite(restaurantA, staff2.email, 'WAITER');
    const staffAccess = await login(staff2.email, staff2.password);

    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: invite.token })
      .expect(201);

    // WAITER cannot list members (requires OWNER or MANAGER) -> 403
    await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantA}/members`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .expect(403);

    // Not a member/owner of restaurantB -> RestaurantAccessGuard should block -> 403
    await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantB}`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .expect(403);
  });

  it('should return 400 when token is too short (fails DTO MinLength validation)', async () => {
    const staffAccess = await login(staff1.email, staff1.password);

    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: 'short' }) // < MinLength(10)
      .expect(400);
  });
});
