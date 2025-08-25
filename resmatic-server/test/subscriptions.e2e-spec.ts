import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as spec from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// E2E Subscriptions flows
// - Login as admin, create restaurant (OWNER)
// - Read plans and pick ENTRANTE by code
// - Create subscription (OWNER/MANAGER)
// - Get active subscription
// - Negative: cannot create second active subscription
// - Change status to CANCELED -> active not found
// - Reactivate to ACTIVE
// - Usage counters: list, increment, list again
// - RBAC: invite staff as WAITER -> waiter can GET/list usage, but cannot create/change/increment
// - Scoping: waiter cannot access another restaurant's subscription (403)
// - Negative: 401 when no auth

describe('Subscriptions E2E', () => {
  let app: INestApplication<spec.App>;
  let prisma: PrismaClient;

  const base = '/api/v1';
  const authBase = `${base}/auth`;
  const restaurantsBase = `${base}/restaurants`;
  const invitesBase = `${base}/invites`;
  const plansBase = `${base}/plans`;
  const subsBase = (rId: string) => `${base}/restaurants/${rId}/subscription`;

  // Seeded admin from prisma/seed.ts
  const adminEmail = 'admin@resmatic.local';
  const adminPassword = 'password123';

  // Test staff who will be invited to restaurant as WAITER
  const staffEmail = 'subscriptions-waiter@resmatic.local';
  const staffPassword = 'pass1234!';

  let adminAccess = '';
  let staffAccess = '';
  let restaurantId = '';
  let restaurantId2 = '';
  let subscriptionId = '';
  let planIdEntrante = '';

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
      await prisma.user.create({
        data: { email: staffEmail, name: 'Subscriptions Waiter', passwordHash, role: 'USER' as any },
      });
    } else {
      await prisma.user.update({ where: { email: staffEmail }, data: { passwordHash } });
    }
  });

  afterAll(async () => {
    try {
      // Clean subscription-related data first to avoid FK issues
      if (restaurantId) {
        const subs = await prisma.subscription.findMany({ where: { restaurantId } });
        for (const s of subs) {
          await prisma.usageCounter.deleteMany({ where: { subscriptionId: s.id } }).catch(() => void 0);
        }
        await prisma.subscription.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.staffInvite.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.restaurantMember.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => void 0);
      }
      if (restaurantId2) {
        const subs2 = await prisma.subscription.findMany({ where: { restaurantId: restaurantId2 } });
        for (const s of subs2) {
          await prisma.usageCounter.deleteMany({ where: { subscriptionId: s.id } }).catch(() => void 0);
        }
        await prisma.subscription.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.staffInvite.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.restaurantMember.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.restaurant.delete({ where: { id: restaurantId2 } }).catch(() => void 0);
      }
      // Remove test staff user
      const staff = await prisma.user.findUnique({ where: { email: staffEmail } });
      if (staff) {
        await prisma.refreshToken.deleteMany({ where: { userId: staff.id } }).catch(() => void 0);
        await prisma.user.delete({ where: { id: staff.id } }).catch(() => void 0);
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
      .send({ name: 'Subscriptions E2E R1' })
      .expect(201);
    restaurantId = res.body.id;
    expect(restaurantId).toBeTruthy();
  });

  it('plans: list and pick ENTRANTE', async () => {
    const res = await request(app.getHttpServer())
      .get(plansBase)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    const plans = res.body as Array<any>;
    const entrante = plans.find((p) => p.code === 'ENTRANTE');
    expect(entrante).toBeTruthy();
    expect(entrante.monthlyPrice).toBeDefined(); // serialized as string
    planIdEntrante = entrante.id;
  });

  it('subscriptions: create ACTIVE for restaurant (OWNER/MANAGER)', async () => {
    const res = await request(app.getHttpServer())
      .post(subsBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ planId: planIdEntrante })
      .expect(201);
    expect(res.body).toHaveProperty('status', 'ACTIVE');
    expect(res.body).toHaveProperty('plan');
    expect(res.body.plan).toHaveProperty('code', 'ENTRANTE');
    subscriptionId = res.body.id;
  });

  it('subscriptions: get active returns the created subscription', async () => {
    const res = await request(app.getHttpServer())
      .get(subsBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(res.body).toHaveProperty('id', subscriptionId);
    expect(res.body).toHaveProperty('status', 'ACTIVE');
  });

  it('subscriptions: cannot create a second active subscription -> 400', async () => {
    await request(app.getHttpServer())
      .post(subsBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ planId: planIdEntrante })
      .expect(400);
  });

  it('subscriptions: change status to CANCELED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${subsBase(restaurantId)}/status`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ status: 'CANCELED' })
      .expect(200);
    expect(res.body).toHaveProperty('status', 'CANCELED');
  });

  it('subscriptions: after cancel, active is not found -> 404', async () => {
    await request(app.getHttpServer())
      .get(subsBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });

  it('subscriptions: reactivate to ACTIVE', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${subsBase(restaurantId)}/status`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(res.body).toHaveProperty('status', 'ACTIVE');
  });

  it('usage: list should return array (possibly empty)', async () => {
    const res = await request(app.getHttpServer())
      .get(`${subsBase(restaurantId)}/usage`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('usage: increment metric ORDERS_CREATED by 2 then by 3 (total 5)', async () => {
    const inc1 = await request(app.getHttpServer())
      .post(`${subsBase(restaurantId)}/usage/increment`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ metric: 'ORDERS_CREATED', amount: 2 })
      .expect(201);
    expect(inc1.body).toHaveProperty('metric', 'ORDERS_CREATED');
    expect(inc1.body).toHaveProperty('value', 2);

    const inc2 = await request(app.getHttpServer())
      .post(`${subsBase(restaurantId)}/usage/increment`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ metric: 'ORDERS_CREATED', amount: 3 })
      .expect(201);
    expect(inc2.body).toHaveProperty('value', 5);

    const list = await request(app.getHttpServer())
      .get(`${subsBase(restaurantId)}/usage`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    const counters = list.body as Array<any>;
    const found = counters.find((c) => c.metric === 'ORDERS_CREATED');
    expect(found).toBeTruthy();
    expect(found.value).toBe(5);
  });

  it('rbac: invite staff as WAITER and allow read-only subscription endpoints', async () => {
    // Owner invites
    const invite = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/invites`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ email: staffEmail, tenantRole: 'WAITER' })
      .expect(201);

    // Staff login
    const login = await request(app.getHttpServer())
      .post(`${authBase}/login`)
      .send({ email: staffEmail, password: staffPassword })
      .expect(200);
    staffAccess = login.body.accessToken;

    // Accept invite
    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ token: invite.body.token })
      .expect(201);

    // Read-only allowed
    await request(app.getHttpServer())
      .get(subsBase(restaurantId))
      .set('Authorization', `Bearer ${staffAccess}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`${subsBase(restaurantId)}/usage`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .expect(200);
  });

  it('rbac: waiter cannot create/change/increment -> 403', async () => {
    await request(app.getHttpServer())
      .post(subsBase(restaurantId))
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ planId: planIdEntrante })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`${subsBase(restaurantId)}/status`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ status: 'CANCELED' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`${subsBase(restaurantId)}/usage/increment`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ metric: 'ORDERS_CREATED', amount: 1 })
      .expect(403);
  });

  it('scoping: waiter cannot read subscription of another restaurant -> 403', async () => {
    // create second restaurant by owner
    const r2 = await request(app.getHttpServer())
      .post(`${restaurantsBase}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Subscriptions E2E R2' })
      .expect(201);
    restaurantId2 = r2.body.id;

    await request(app.getHttpServer())
      .get(subsBase(restaurantId2))
      .set('Authorization', `Bearer ${staffAccess}`)
      .expect(403);
  });

  it('negative: no auth returns 401 on get active subscription', async () => {
    await request(app.getHttpServer()).get(subsBase(restaurantId)).expect(401);
  });
});
