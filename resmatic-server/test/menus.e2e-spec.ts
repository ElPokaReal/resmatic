import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as spec from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Menus E2E
 * Cobertura:
 * - CRUD de Menu, MenuSection, MenuItem con scoping por restaurantId
 * - RBAC: OWNER/MANAGER pueden mutar; WAITER solo lectura
 * - Validaciones 400/404
 */
describe('Menus E2E', () => {
  let app: INestApplication<spec.App>;
  let prisma: PrismaClient;

  const base = '/api/v1';
  const authBase = `${base}/auth`;
  const restaurantsBase = `${base}/restaurants`;
  const invitesBase = `${base}/invites`;

  // Seeded admin from prisma/seed.ts
  const adminEmail = 'admin@resmatic.local';
  const adminPassword = 'password123';

  // Test user (waiter)
  const waiterEmail = 'waiter-menus@resmatic.local';
  const waiterPassword = 'pass1234!';
  // Test user (manager)
  const managerEmail = 'manager-menus@resmatic.local';
  const managerPassword = 'pass1234!';

  let adminAccess = '';
  let waiterAccess = '';
  let managerAccess = '';
  let restaurantId = '';
  let inviteToken = '';

  let menuId = '';
  let sectionId = '';
  let itemId = '';
  let restaurantId2 = '';
  let menuId2 = '';
  let sectionId2 = '';

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

    // Ensure waiter user exists with known password
    const passwordHash = await bcrypt.hash(waiterPassword, 10);
    const existing = await prisma.user.findUnique({ where: { email: waiterEmail } });
    if (!existing) {
      await prisma.user.create({
        data: { email: waiterEmail, name: 'Waiter Menus', passwordHash, role: 'USER' as any },
      });
    } else {
      await prisma.user.update({ where: { email: waiterEmail }, data: { passwordHash } });
    }

    // Ensure manager user exists with known password
    const managerPasswordHash = await bcrypt.hash(managerPassword, 10);
    const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } });
    if (!existingManager) {
      await prisma.user.create({
        data: { email: managerEmail, name: 'Manager Menus', passwordHash: managerPasswordHash, role: 'USER' as any },
      });
    } else {
      await prisma.user.update({ where: { email: managerEmail }, data: { passwordHash: managerPasswordHash } });
    }
  });

  afterAll(async () => {
    try {
      // Cleanup created restaurant cascades menus/sections/items
      if (restaurantId) {
        await prisma.staffInvite.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.restaurantMember.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => void 0);
      }
      if (restaurantId2) {
        await prisma.staffInvite.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.restaurantMember.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.restaurant.delete({ where: { id: restaurantId2 } }).catch(() => void 0);
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
    adminAccess = res.body.accessToken;
    expect(adminAccess).toBeTruthy();
  });

  it('restaurants: create', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Menus Test Restaurant' })
      .expect(201);
    restaurantId = res.body.id;
    expect(restaurantId).toBeTruthy();
  });

  it('restaurants: invite WAITER and accept', async () => {
    const invite = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/invites`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ email: waiterEmail, tenantRole: 'WAITER' })
      .expect(201);
    inviteToken = invite.body.token;

    const loginWaiter = await request(app.getHttpServer())
      .post(`${authBase}/login`)
      .send({ email: waiterEmail, password: waiterPassword })
      .expect(200);
    waiterAccess = loginWaiter.body.accessToken;

    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${waiterAccess}`)
      .send({ token: inviteToken })
      .expect(201);
  });

  it('restaurants: invite MANAGER and accept', async () => {
    const invite = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/invites`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ email: managerEmail, tenantRole: 'MANAGER' })
      .expect(201);

    const loginManager = await request(app.getHttpServer())
      .post(`${authBase}/login`)
      .send({ email: managerEmail, password: managerPassword })
      .expect(200);
    managerAccess = loginManager.body.accessToken;

    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .send({ token: invite.body.token })
      .expect(201);
  });

  // --- Menus CRUD ---
  it('menus: create (OWNER/MANAGER) - admin acts as OWNER', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Main Menu', description: 'Menu principal', sortOrder: 1 })
      .expect(201);
    menuId = res.body.id;
    expect(menuId).toBeTruthy();
  });

  it('menus: waiter cannot create (403)', async () => {
    await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus`)
      .set('Authorization', `Bearer ${waiterAccess}`)
      .send({ name: 'Not allowed' })
      .expect(403);
  });

  it('menus: list (all roles)', async () => {
    const res = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus`)
      .set('Authorization', `Bearer ${waiterAccess}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((m: any) => m.id === menuId)).toBeTruthy();
  });

  it('menus: get one', async () => {
    const res = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(res.body).toHaveProperty('id', menuId);
  });

  it('menus: update', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${restaurantsBase}/${restaurantId}/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ description: 'Actualizado', sortOrder: 2, isActive: true })
      .expect(200);
    expect(res.body).toHaveProperty('description', 'Actualizado');
    expect(res.body).toHaveProperty('sortOrder', 2);
  });

  // --- Sections CRUD ---
  it('sections: create', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Burgers', description: 'Sección de hamburguesas', sortOrder: 1 })
      .expect(201);
    sectionId = res.body.id;
    expect(sectionId).toBeTruthy();
  });

  it('sections: manager can update', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .send({ description: 'Updated by manager' })
      .expect(200);
    expect(res.body).toHaveProperty('description', 'Updated by manager');
  });

  it('sections: waiter cannot update (403)', async () => {
    await request(app.getHttpServer())
      .patch(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}`)
      .set('Authorization', `Bearer ${waiterAccess}`)
      .send({ name: 'New Name' })
      .expect(403);
  });

  it('sections: list and get', async () => {
    const list = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections`)
      .set('Authorization', `Bearer ${waiterAccess}`)
      .expect(200);
    expect(list.body.find((s: any) => s.id === sectionId)).toBeTruthy();

    const get = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(get.body).toHaveProperty('id', sectionId);
  });

  it('sections: create without name -> 400', async () => {
    await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ description: 'sin nombre' })
      .expect(400);
  });

  it('sections: update by admin', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ description: 'Section updated', sortOrder: 2 })
      .expect(200);
    expect(res.body).toHaveProperty('description', 'Section updated');
  });

  // Create a second restaurant/menu/section for scoping tests
  it('restaurants: create second', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Menus Test Restaurant 2' })
      .expect(201);
    restaurantId2 = res.body.id;
    expect(restaurantId2).toBeTruthy();
  });

  it('menus: create in second restaurant', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId2}/menus`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Second Menu' })
      .expect(201);
    menuId2 = res.body.id;
    expect(menuId2).toBeTruthy();
  });

  it('sections: create in second menu', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId2}/menus/${menuId2}/sections`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Second Section' })
      .expect(201);
    sectionId2 = res.body.id;
    expect(sectionId2).toBeTruthy();
  });

  it('scoping: menu from restaurant A under restaurant B path -> 404', async () => {
    await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId2}/menus/${menuId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });

  it('scoping: section from restaurant A under restaurant B path -> 404', async () => {
    await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId2}/menus/${menuId2}/sections/${sectionId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });

  it('scoping: create section under mismatched menu/restaurant -> 404', async () => {
    await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId2}/menus/${menuId}/sections`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Should fail' })
      .expect(404);
  });

  it('scoping: manager cannot create section in second restaurant -> 403', async () => {
    await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId2}/menus/${menuId2}/sections`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .send({ name: 'Should be forbidden' })
      .expect(403);
  });

  // --- Items CRUD ---
  it('items: create', async () => {
    const res = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Classic Burger', description: 'Doble carne', price: 9.99, tags: ['burger'], sortOrder: 1 })
      .expect(201);
    itemId = res.body.id;
    expect(itemId).toBeTruthy();
  });

  it('items: list/get', async () => {
    const list = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items`)
      .set('Authorization', `Bearer ${waiterAccess}`)
      .expect(200);
    expect(list.body.find((i: any) => i.id === itemId)).toBeTruthy();

    const get = await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(get.body).toHaveProperty('id', itemId);
  });

  it('items: update', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ price: 10.5, tags: ['burger', 'cheese'], status: 'INACTIVE' })
      .expect(200);
    expect(res.body).toHaveProperty('price');
    expect(res.body).toHaveProperty('status', 'INACTIVE');
  });

  it('items: update with invalid enum status -> 400', async () => {
    await request(app.getHttpServer())
      .patch(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ status: 'DISABLED' })
      .expect(400);
  });

  it('items: manager can create and delete', async () => {
    const create = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .send({ name: 'Manager Special', price: 7.75 })
      .expect(201);
    const mgrItemId = create.body.id;
    expect(mgrItemId).toBeTruthy();

    const del = await request(app.getHttpServer())
      .delete(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${mgrItemId}`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .expect(200);
    expect(del.body).toHaveProperty('ok', true);
  });

  it('items: waiter cannot delete (403)', async () => {
    await request(app.getHttpServer())
      .delete(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
      .set('Authorization', `Bearer ${waiterAccess}`)
      .expect(403);
  });

  it('items: delete by admin', async () => {
    const res = await request(app.getHttpServer())
      .delete(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  // --- Validaciones ---
  it('validation: create menu without name -> 400', async () => {
    await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ description: 'sin nombre' })
      .expect(400);
  });

  it('validation: create item with negative price -> 400', async () => {
    await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Bad', price: -1 })
      .expect(400);
  });

  it('validation: create item with non-number price -> 400', async () => {
    await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'BadType', price: 'abc' as any })
      .expect(400);
  });

  // --- 404 Not Found ---
  it('notfound: get menu with wrong id -> 404', async () => {
    await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/ck_fake_menu_404`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });

  it('notfound: get section with wrong id -> 404', async () => {
    await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/ck_fake_section_404`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });

  it('notfound: get item with wrong id -> 404', async () => {
    await request(app.getHttpServer())
      .get(`${restaurantsBase}/${restaurantId}/menus/${menuId}/sections/${sectionId}/items/ck_fake_item_404`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });
});
