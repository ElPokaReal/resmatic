# TODO / Progreso

Fecha: 2025-08-22

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

## En curso
- Menú/Carta: CRUD de `Menu`/`MenuSection`/`MenuItem` (backend) en `src/menus/`.
- Swagger: ejemplos/validaciones adicionales para Orders.

## Próximos pasos
- Suscripciones (backend): `Plan`, `Subscription`, `UsageCounter` + enforcement de límites.
- Deploy/Entornos: preparar Dockerfile(s) de producción y pipeline CI (lint/test/migrate); staging.

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
