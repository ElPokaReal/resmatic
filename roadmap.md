# Roadmap ResMatic (Backend)

Este roadmap cubre la evolución del backend para gestionar usuarios, restaurantes y meseros, y preparar el soporte de planes de suscripción (solo backend por ahora).

## Estado actual
- **Auth + Roles (completado)**
  - Enum `Role` (`ADMIN`, `USER`) y campo `user.role` en Prisma.
  - JWT incluye `role`. Decorador `@Roles()` + `RolesGuard` y ruta `admin-check`.
- **Refresh tokens hardening (en progreso)**
  - Modelo `RefreshToken` con `tokenHash`, `revoked`, `expiresAt`.
  - Servicio para hash, verificación y rotación. Integrado en `AuthService`.
  - Pendiente ejecutar migración/generate de Prisma.

## Prioridades inmediatas
1) Finalizar refresh tokens
   - `bun run prisma:generate`
   - `bun run prisma:migrate -- --name add-refresh-token`
2) Logout y política de sesiones
   - Endpoint `POST /auth/logout` que revoca todos los refresh tokens del usuario.
   - (Opcional) Política: permitir múltiples dispositivos o sesión única.

---

## Fase 2 — Restaurantes y Meseros (Multi-tenant)
- **Modelos Prisma**
  - `Restaurant`: id, ownerId, name, status, createdAt.
  - `RestaurantMember` (o `Membership`): `userId`, `restaurantId`, `tenantRole` (`OWNER`, `MANAGER`, `WAITER`), invitedAt, joinedAt.
  - `StaffInvite`: `restaurantId`, `email`, `tenantRole`, `token`, `expiresAt`, `acceptedAt`.
- **Autorización por inquilino (tenant)**
  - `RestaurantAccessGuard` y decoradores: `@RestaurantParam()`, `@RestaurantRoles('OWNER'|'MANAGER'|'WAITER')`.
  - Todas las consultas/acciones scoped por `restaurantId`.
- **Servicios/Controladores**
  - Restaurantes: crear/listar propios, actualizar, archivar.
  - Staff: invitar/aceptar/expulsar, cambiar rol.
- **Entregables**
  - Endpoints: `POST/GET/PATCH/DELETE /restaurants`, `POST/GET /restaurants/:id/members`, `POST /restaurants/:id/invites`, `POST /invites/accept`.
  - E2E: ownership y roles por restaurante.

## Fase 3 — Menú y Carta
- **Modelos Prisma**: `Menu`, `MenuSection`, `MenuItem` (precio, estado, tags, orden).
- **Endpoints**: CRUD de menús, secciones e ítems, con scoping por `restaurantId`.
- **Permisos**: `OWNER`/`MANAGER` editan; `WAITER` lectura.

## Fase 4 — Pedidos (Orders)
- **Modelos Prisma**: `Order` (restaurantId, mesa/área, estado), `OrderItem` (menuItemId, qty, priceSnapshot), `OrderEvent`.
- **Flujo**: crear pedido, añadir ítems, estados (nuevo → preparación → servido → cerrado).
- **Endpoints**: `POST/GET/PATCH /restaurants/:id/orders`, `POST /orders/:id/items`, `PATCH /orders/:id/status`.

## Fase 5 — Suscripciones (Backend)
- **Modelos Prisma**: `Plan` (límites: restaurantes, meseros, menús, pedidos concurrentes), `Subscription`, `UsageCounter`.
- **Enforcement**: guard/interceptor que valide límites antes de crear recursos.
- **Endpoints**: `GET /plans`, `GET/POST /subscriptions`. (Pagos se agregan en otra fase.)

## Fase 6 — Observabilidad, Calidad y DX
- **Swagger**: tags por dominio, ejemplos, auth schemes.
- **Logs y métricas**: interceptor de logging, health checks.
- **Testing**: E2E para auth, restaurantes y staff; pruebas de límites.
- **Mantenimiento**: job para purgar refresh tokens expirados.

## Fase 7 — Deploy y entornos
- **Config**: `.env` por entorno, validación de variables.
- **Contenedores**: Dockerfile + docker-compose (app + DB).
- **CI**: lint + test + migraciones.
- **Entrega**: staging y producción.

---

## Hitos por aceptación
- **F2 Restaurantes/Staff**: crear restaurante, listar los propios, invitar/aceptar meseros, gestión de miembros por rol.
- **F3 Menú**: CRUD con permisos.
- **F4 Pedidos**: flujo completo con eventos.
- **F5 Suscripción**: límites del plan aplicados y errores adecuados.

## Notas
- Backend usa Bun para scripts (`bun run ...`).
- Roles globales (`ADMIN`, `USER`) ya operativos. Roles por restaurante se modelan en `RestaurantMember.tenantRole`.
- A futuro se integrarán pagos (Stripe) para activar planes.
