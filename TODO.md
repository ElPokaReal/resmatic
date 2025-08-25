# TODO / Progreso

Fecha: 2025-08-25

## Hecho
- Auth + Roles globales (`ADMIN`, `USER`).
- Refresh Tokens hardening (rotación/revocación masiva, límite de sesiones).
- Multi-tenant Restaurantes y Staff (roles `OWNER|MANAGER|WAITER`) con guards y decoradores.
- Swagger base (tags, esquemas de seguridad, DTOs de respuesta).
- Pedidos (Orders):
  - Modelos Prisma `Order`, `OrderItem`, `OrderEvent` y back-relations en `Restaurant`/`MenuItem`.
  - Migración aplicada y Prisma Client regenerado.
  - Módulo Nest `src/orders/` (service, controller, DTOs) con scoping por `restaurantId` y RBAC.
  - E2E Orders iniciales: crear pedido, add/update/delete ítems (recalcula total), transiciones de estado, eventos y sanity RBAC (WAITER).
  - Prisma: migración a `prisma.config.ts` y scripts con `dotenv-cli` (generate/migrate/seed OK).
  - Menús: controller actualizado con tipos Prisma (sin `as any`) para updates de `Menu` y `MenuSection`.
  - Docker (dev): `docker-compose.yml` con `db` (Postgres), `server` (Nest+Bun) y `app` (Next+Bun); `.dockerignore` en `resmatic-server/`; `README.md` actualizado con comandos.
  - E2E de Menús: agregado `resmatic-server/test/menus.e2e-spec.ts` (CRUD, validaciones 400/404 y RBAC OWNER/MANAGER/WAITER).
- Swagger/Orders: `total` (Order) y `unitPrice` (OrderItem) documentados como string con ejemplos en DTOs.
- CI backend: workflow `.github/workflows/backend-ci.yml` con Bun (lint, migraciones, seed, E2E contra Postgres de servicio).
- Dockerfile producción backend: `resmatic-server/Dockerfile` multi-stage (build + runtime) con `prisma generate` y `nest build`.
- Suscripciones (Backend):
  - Modelos Prisma `Plan`, `Subscription`, `UsageCounter`.
  - Módulo Nest `src/subscriptions/*` (controllers, services, DTOs).
  - Endpoints implementados: `GET /plans`, `GET /restaurants/:id/subscription`, `POST /restaurants/:id/subscription`, `PATCH /restaurants/:id/subscription/status`, `GET /restaurants/:id/subscription/usage`, `POST /restaurants/:id/subscription/usage/increment`.
  - E2E: `resmatic-server/test/subscriptions.e2e-spec.ts` cubriendo alta/cancelación/reactivación, RBAC/Scoping y contadores de uso.

## En curso
- Menú/Carta: CRUD de `Menu`/`MenuSection`/`MenuItem` (backend) en `src/menus/`.
- Swagger: ejemplos/validaciones adicionales para Orders.
- Orders E2E: ampliación de casos negativos (400/404/403) y preparación de transiciones de estado y recálculo de totales.

## Próximos pasos
- Enforcement de límites de Suscripciones: validación de límites por plan antes de crear recursos.
- Deploy/Entornos: preparar staging y pipeline de deploy (migrate deploy en release) y publicación de imágenes.

## Endpoints de Orders (v1)
- `GET /restaurants/:id/orders`
- `POST /restaurants/:id/orders`
- `GET /restaurants/:id/orders/:orderId`
- `PATCH /restaurants/:id/orders/:orderId`
- `POST /restaurants/:id/orders/:orderId/status`
- `GET /restaurants/:id/orders/:orderId/events`
- `POST /restaurants/:id/orders/:orderId/items`
- `PATCH /restaurants/:id/orders/:orderId/items/:orderItemId`
- `DELETE /restaurants/:id/orders/:orderId/items/:orderItemId`

## Rutas/archivos relevantes
- Prisma: `resmatic-server/prisma/schema.prisma`
- Orders módulo: `resmatic-server/src/orders/*`
- Guards/Decoradores: `resmatic-server/src/restaurants/guards/restaurant-access.guard.ts`, `resmatic-server/src/restaurants/decorators/restaurant-roles.decorator.ts`
- Swagger: `resmatic-server/src/orders/orders.controller.ts`

## Comandos útiles (Bun)
- Generar client Prisma: `bun run prisma:generate`
- Migrar DB: `bun run prisma:migrate --name <nombre>`
- Seed: `bun run prisma:seed`
- E2E: `bun run test:e2e`
- Dev server: `bun run start:dev`
