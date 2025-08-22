import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import * as spec from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth E2E', () => {
  let app: INestApplication<spec.App>;
  const base = '/api/v1';
  const authBase = `${base}/auth`;

  // Seed user from prisma/seed.ts
  const email = 'admin@resmatic.local';
  const password = 'password123';

  let accessToken = '';
  let refreshToken = '';

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login should return access and refresh tokens for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post(`${authBase}/login`)
      .send({ email, password })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', email);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('GET /auth/me should work with access token', async () => {
    const res = await request(app.getHttpServer())
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', email);
  });

  it('GET /auth/admin-check should allow ADMIN role', async () => {
    const res = await request(app.getHttpServer())
      .get(`${authBase}/admin-check`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('ok', true);
  });

  it('POST /auth/refresh should rotate refresh token and invalidate the old one', async () => {
    // Use current refresh token to get new pair
    const res = await request(app.getHttpServer())
      .post(`${authBase}/refresh`)
      .set('Authorization', `Bearer ${refreshToken}`);

    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.log('Refresh response:', res.status, res.body);
    }
    expect(res.status).toBe(200);

    const newAccess = res.body.accessToken as string;
    const newRefresh = res.body.refreshToken as string;

    expect(newAccess).toBeTruthy();
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toEqual(refreshToken);

    // Old refresh should no longer be valid
    await request(app.getHttpServer())
      .post(`${authBase}/refresh`)
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);

    // Update tokens to latest for next tests
    accessToken = newAccess;
    refreshToken = newRefresh;
  });

  it('POST /auth/logout should revoke all refresh tokens for the user', async () => {
    // call logout with access token
    await request(app.getHttpServer())
      .post(`${authBase}/logout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveProperty('ok', true);
      });

    // Now refresh with the latest token must fail
    await request(app.getHttpServer())
      .post(`${authBase}/refresh`)
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);
  });
});
