import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as spec from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// This E2E covers core Orders flows and RBAC sanity checks
// Flow:
// - Login as admin, create restaurant (OWNER)
// - Create menu, section, and item
// - Create order as OWNER
// - Add item, update item, delete item (check total recalculation)
// - Change status through several transitions and list events
// - Create/Invite staff as WAITER, accept invite
// - As WAITER, create a second order and add an item (RBAC allowed)
// - Negative: call Orders endpoint without auth -> 401

describe('Orders E2E', () => {
  let app: INestApplication<spec.App>;
  let prisma: PrismaClient;

  const base = '/api/v1';
  const authBase = `${base}/auth`;
  const restaurantsBase = `${base}/restaurants`;
  const menusBase = (rId: string) => `${base}/restaurants/${rId}/menus`;
  const ordersBase = (rId: string) => `${base}/restaurants/${rId}/orders`;
  const invitesBase = `${base}/invites`;

  // Seeded admin from prisma/seed.ts
  const adminEmail = 'admin@resmatic.local';
  const adminPassword = 'password123';

  // Test staff who will be invited to restaurant as WAITER
  const staffEmail = 'waiter-orders@resmatic.local';
  const staffPassword = 'pass1234!';
  // Test staff who will be invited as MANAGER
  const managerEmail = 'manager-orders@resmatic.local';
  const managerPassword = 'pass1234!';

  let adminAccess = '';
  let staffAccess = '';
  let managerAccess = '';
  let restaurantId = '';
  let menuId = '';
  let sectionId = '';
  let itemId = '';
  let itemId2 = '';
  let orderId = '';
  let restaurantId2 = '';
  let menuId2 = '';
  let sectionId2 = '';
  let itemOtherRestaurantId = '';

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
        data: { email: staffEmail, name: 'Orders Waiter', passwordHash, role: 'USER' as any },
      });
    } else {
      await prisma.user.update({ where: { email: staffEmail }, data: { passwordHash } });
    }

    // Ensure manager user exists with known password
    const managerPasswordHash = await bcrypt.hash(managerPassword, 10);
    const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } });
    if (!existingManager) {
      await prisma.user.create({
        data: { email: managerEmail, name: 'Orders Manager', passwordHash: managerPasswordHash, role: 'USER' as any },
      });
    } else {
      await prisma.user.update({ where: { email: managerEmail }, data: { passwordHash: managerPasswordHash } });
    }
  });

  afterAll(async () => {
    try {
      if (restaurantId) {
        // Clean related records via cascades
        await prisma.staffInvite.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.restaurantMember.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        // Important: delete orders BEFORE menus (OrderItem -> MenuItem has ON DELETE RESTRICT)
        await prisma.order.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.menu.deleteMany({ where: { restaurantId } }).catch(() => void 0);
        await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => void 0);
      }
      if (restaurantId2) {
        await prisma.staffInvite.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.restaurantMember.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.order.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.menu.deleteMany({ where: { restaurantId: restaurantId2 } }).catch(() => void 0);
        await prisma.restaurant.delete({ where: { id: restaurantId2 } }).catch(() => void 0);
      }
      // Remove test staff user
      const staff = await prisma.user.findUnique({ where: { email: staffEmail } });
      if (staff) {
        await prisma.refreshToken.deleteMany({ where: { userId: staff.id } }).catch(() => void 0);
        await prisma.user.delete({ where: { id: staff.id } }).catch(() => void 0);
      }

      // Remove test manager user
      const manager = await prisma.user.findUnique({ where: { email: managerEmail } });
      if (manager) {
        await prisma.refreshToken.deleteMany({ where: { userId: manager.id } }).catch(() => void 0);
        await prisma.user.delete({ where: { id: manager.id } }).catch(() => void 0);
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
      .send({ name: 'Orders E2E R1' })
      .expect(201);
    restaurantId = res.body.id;
    expect(restaurantId).toBeTruthy();
  });

  it('menus: create menu, section, item', async () => {
    // create menu
    const mRes = await request(app.getHttpServer())
      .post(menusBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Main Menu' })
      .expect(201);
    menuId = mRes.body.id;

    // create section
    const sRes = await request(app.getHttpServer())
      .post(`${menusBase(restaurantId)}/${menuId}/sections`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Burgers' })
      .expect(201);
    sectionId = sRes.body.id;

    // create item #1
    const iRes = await request(app.getHttpServer())
      .post(`${menusBase(restaurantId)}/${menuId}/sections/${sectionId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Classic Burger', price: 9.99 })
      .expect(201);
    itemId = iRes.body.id;

    // create item #2 (same restaurant) for multi-item totals
    const i2Res = await request(app.getHttpServer())
      .post(`${menusBase(restaurantId)}/${menuId}/sections/${sectionId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Fries', price: 4.5 })
      .expect(201);
    itemId2 = i2Res.body.id;

    expect(menuId && sectionId && itemId && itemId2).toBeTruthy();
  });

  it('restaurants: create second restaurant with its own menu and item', async () => {
    const r2 = await request(app.getHttpServer())
      .post(`${restaurantsBase}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Orders E2E R2' })
      .expect(201);
    restaurantId2 = r2.body.id;

    const m2 = await request(app.getHttpServer())
      .post(menusBase(restaurantId2))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Menu R2' })
      .expect(201);
    menuId2 = m2.body.id;

    const s2 = await request(app.getHttpServer())
      .post(`${menusBase(restaurantId2)}/${menuId2}/sections`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'Section R2' })
      .expect(201);
    sectionId2 = s2.body.id;

    const iR2 = await request(app.getHttpServer())
      .post(`${menusBase(restaurantId2)}/${menuId2}/sections/${sectionId2}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ name: 'R2 Drink', price: 5.25 })
      .expect(201);
    itemOtherRestaurantId = iR2.body.id;

    expect(restaurantId2 && menuId2 && sectionId2 && itemOtherRestaurantId).toBeTruthy();
  });

  it('orders: create as OWNER', async () => {
    const res = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 5, customerName: 'Alice' })
      .expect(201);
    orderId = res.body.id;
    expect(orderId).toBeTruthy();
    expect(res.body).toHaveProperty('status');
    expect(res.body.total).toBeDefined();
  });

  it('orders: add item, update item, delete item with total recalculation', async () => {
    // add item (qty 1) -> total 9.99
    const addRes = await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${orderId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: itemId, quantity: 1 })
      .expect(201);
    expect(parseFloat(addRes.body.total)).toBeCloseTo(9.99, 2);

    // read created orderItem id via prisma (API returns only Order)
    const createdItem = await prisma.orderItem.findFirst({ where: { orderId }, orderBy: { createdAt: 'asc' } });
    expect(createdItem?.id).toBeTruthy();
    const orderItemId = createdItem!.id;

    // update item qty to 3 -> total 29.97
    const upRes = await request(app.getHttpServer())
      .patch(`${ordersBase(restaurantId)}/${orderId}/items/${orderItemId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ quantity: 3 })
      .expect(200);
    expect(parseFloat(upRes.body.total)).toBeCloseTo(29.97, 2);

    // delete item -> total 0.00
    const delRes = await request(app.getHttpServer())
      .delete(`${ordersBase(restaurantId)}/${orderId}/items/${orderItemId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(delRes.body).toHaveProperty('ok', true);

    // confirm order total is 0 via getOne
    const getRes = await request(app.getHttpServer())
      .get(`${ordersBase(restaurantId)}/${orderId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(parseFloat(getRes.body.total)).toBeCloseTo(0, 2);
  });

  it('orders: total recalculation with multiple items and reordering', async () => {
    // create a fresh order
    const oRes = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 6, customerName: 'Charlie' })
      .expect(201);
    const oid = oRes.body.id;

    // add item1 qty 2 -> 19.98
    const add1 = await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${oid}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: itemId, quantity: 2 })
      .expect(201);
    expect(parseFloat(add1.body.total)).toBeCloseTo(19.98, 2);

    // add item2 qty 3 -> +13.50 = 33.48
    const add2 = await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${oid}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: itemId2, quantity: 3 })
      .expect(201);
    expect(parseFloat(add2.body.total)).toBeCloseTo(33.48, 2);

    // fetch items
    const items = await prisma.orderItem.findMany({ where: { orderId: oid }, orderBy: { createdAt: 'asc' } });
    const itemA = items[0];
    const itemB = items[1];

    // sanity check: total remains the same if we perform a no-op read
    const noOpGet = await request(app.getHttpServer())
      .get(`${ordersBase(restaurantId)}/${oid}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(parseFloat(noOpGet.body.total)).toBeCloseTo(33.48, 2);

    // reduce qty of item2 to 1 -> 19.98 + 4.50 = 24.48
    const upQty = await request(app.getHttpServer())
      .patch(`${ordersBase(restaurantId)}/${oid}/items/${itemB.id}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ quantity: 1 })
      .expect(200);
    expect(parseFloat(upQty.body.total)).toBeCloseTo(24.48, 2);

    // delete item1 -> leaves 4.50
    const del1 = await request(app.getHttpServer())
      .delete(`${ordersBase(restaurantId)}/${oid}/items/${itemA.id}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(del1.body).toHaveProperty('ok', true);

    const getFinal = await request(app.getHttpServer())
      .get(`${ordersBase(restaurantId)}/${oid}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    expect(parseFloat(getFinal.body.total)).toBeCloseTo(4.5, 2);
  });

  it('orders: change status and list events', async () => {
    const transitions = ['CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED'];
    for (const st of transitions) {
      const res = await request(app.getHttpServer())
        .post(`${ordersBase(restaurantId)}/${orderId}/status`)
        .set('Authorization', `Bearer ${adminAccess}`)
        .send({ status: st, message: `Set to ${st}` })
        .expect(201);
      expect(res.body).toHaveProperty('status', st);
    }

    const evRes = await request(app.getHttpServer())
      .get(`${ordersBase(restaurantId)}/${orderId}/events`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    const events = evRes.body as Array<any>;
    expect(events.length).toBeGreaterThanOrEqual(transitions.length);
    expect(events[events.length - 1].status).toBe('COMPLETED');
  });

  it('orders: cancel order adds event and sets status', async () => {
    // create order to cancel
    const resOrder = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 8, customerName: 'Daisy' })
      .expect(201);
    const oid = resOrder.body.id;

    const res = await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${oid}/status`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ status: 'CANCELED', message: 'Customer left' })
      .expect(201);
    expect(res.body).toHaveProperty('status', 'CANCELED');

    const evRes = await request(app.getHttpServer())
      .get(`${ordersBase(restaurantId)}/${oid}/events`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);
    const events = evRes.body as Array<any>;
    expect(events[events.length - 1].status).toBe('CANCELED');
  });

  it('rbac: invite staff as WAITER and allow creating order', async () => {
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

    // Staff creates order OK
    const res = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ tableNumber: 7, customerName: 'Bob' })
      .expect(201);
    expect(res.body).toHaveProperty('id');
  });

  it('rbac: waiter cannot list orders for other restaurant -> 403', async () => {
    await request(app.getHttpServer())
      .get(ordersBase(restaurantId2))
      .set('Authorization', `Bearer ${staffAccess}`)
      .expect(403);
  });

  it('rbac: invite staff as MANAGER and allow updating order', async () => {
    // Owner invites MANAGER
    const invite = await request(app.getHttpServer())
      .post(`${restaurantsBase}/${restaurantId}/invites`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ email: managerEmail, tenantRole: 'MANAGER' })
      .expect(201);

    // Manager login
    const login = await request(app.getHttpServer())
      .post(`${authBase}/login`)
      .send({ email: managerEmail, password: managerPassword })
      .expect(200);
    managerAccess = login.body.accessToken;

    // Accept invite
    await request(app.getHttpServer())
      .post(`${invitesBase}/accept`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .send({ token: invite.body.token })
      .expect(201);

    // Manager updates existing order
    const res = await request(app.getHttpServer())
      .patch(`${ordersBase(restaurantId)}/${orderId}`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .send({ notes: 'Updated by manager' })
      .expect(200);
    expect(res.body).toHaveProperty('notes', 'Updated by manager');
  });

  it('rbac: manager can add and delete an item in the order', async () => {
    // Add item
    const addRes = await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${orderId}/items`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .send({ menuItemId: itemId, quantity: 1 })
      .expect(201);
    expect(addRes.body).toHaveProperty('id');

    // Fetch last created item id
    const createdItem = await prisma.orderItem.findFirst({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    const orderItemId = createdItem!.id;

    // Delete item
    const delRes = await request(app.getHttpServer())
      .delete(`${ordersBase(restaurantId)}/${orderId}/items/${orderItemId}`)
      .set('Authorization', `Bearer ${managerAccess}`)
      .expect(200);
    expect(delRes.body).toHaveProperty('ok', true);
  });

  it('rbac: manager cannot list orders for other restaurant -> 403', async () => {
    await request(app.getHttpServer())
      .get(ordersBase(restaurantId2))
      .set('Authorization', `Bearer ${managerAccess}`)
      .expect(403);
  });

  it('negative: no auth returns 401 on list orders', async () => {
    await request(app.getHttpServer()).get(ordersBase(restaurantId)).expect(401);
  });

  it('negative: add item with quantity 0 -> 400', async () => {
    const resOrder = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 9 })
      .expect(201);
    const oid = resOrder.body.id;

    await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${oid}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: itemId, quantity: 0 })
      .expect(400);
  });

  it('negative: add item with non-existent menuItemId -> 404', async () => {
    const resOrder = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 10 })
      .expect(201);
    const oid = resOrder.body.id;

    await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${oid}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: 'ck_fake_menu_item', quantity: 1 })
      .expect(404);
  });

  it('negative: getOne with wrong orderId -> 404', async () => {
    await request(app.getHttpServer())
      .get(`${ordersBase(restaurantId)}/ck_fake_order_id`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });

  it('rbac: waiter cannot update order -> 403', async () => {
    // Create order as OWNER
    const resOrder = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 11 })
      .expect(201);
    const oid = resOrder.body.id;

    // Ensure waiter logged in (staffAccess set earlier)
    await request(app.getHttpServer())
      .patch(`${ordersBase(restaurantId)}/${oid}`)
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ notes: 'try update as waiter' })
      .expect(403);
  });

  it('scoping: cannot add item from other restaurant into this order -> 404', async () => {
    await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${orderId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: itemOtherRestaurantId, quantity: 1 })
      .expect(404);
  });
  
  it('negative: change status with invalid enum -> 400', async () => {
    await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${orderId}/status`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ status: 'INVALID_STATUS', message: 'bad' })
      .expect(400);
  });

  it('negative: change status on wrong orderId -> 404', async () => {
    await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/ck_fake_order_id/status`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ status: 'CONFIRMED' })
      .expect(404);
  });

  it('negative: update order with tableNumber 0 -> 400', async () => {
    // create fresh order
    const resOrder = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 2 })
      .expect(201);
    const oid = resOrder.body.id;

    await request(app.getHttpServer())
      .patch(`${ordersBase(restaurantId)}/${oid}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 0 })
      .expect(400);
  });

  it('negative: update order item with sortOrder -1 -> 400', async () => {
    // prepare order with an item
    const oRes = await request(app.getHttpServer())
      .post(ordersBase(restaurantId))
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ tableNumber: 13 })
      .expect(201);
    const oid = oRes.body.id;

    const addRes = await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${oid}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: itemId, quantity: 1 })
      .expect(201);
    expect(addRes.body.id).toBeDefined();

    const createdItem = await prisma.orderItem.findFirst({ where: { orderId: oid }, orderBy: { createdAt: 'asc' } });
    const oidItem = createdItem!.id;

    await request(app.getHttpServer())
      .patch(`${ordersBase(restaurantId)}/${oid}/items/${oidItem}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ sortOrder: -1 })
      .expect(400);
  });

  it('negative: delete item with wrong id -> 404', async () => {
    await request(app.getHttpServer())
      .delete(`${ordersBase(restaurantId)}/${orderId}/items/ck_fake_orit_id`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });

  it('negative: add item with too long note (>500) -> 400', async () => {
    const longNote = 'x'.repeat(501);
    await request(app.getHttpServer())
      .post(`${ordersBase(restaurantId)}/${orderId}/items`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({ menuItemId: itemId, quantity: 1, note: longNote })
      .expect(400);
  });

  it('negative: list events with wrong orderId -> 404', async () => {
    await request(app.getHttpServer())
      .get(`${ordersBase(restaurantId)}/ck_fake_order_id/events`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(404);
  });
});
