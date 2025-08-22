# Roadmap ResMatic (Backend)

Este roadmap cubre la evolución del backend para gestionar usuarios, restaurantes y meseros, y preparar el soporte de planes de suscripción (solo backend por ahora).

## Estado actual
- **Auth + Roles (completado)**
  - Enum `Role` (`ADMIN`, `USER`) y campo `user.role` en Prisma.
  - JWT incluye `role`. Decorador `@Roles()` + `RolesGuard` y ruta `admin-check`.
- **Refresh tokens hardening (completado)**
  - Modelo `RefreshToken` con `tokenHash`, `revoked`, `expiresAt`.
  - Servicio para hash, verificación, rotación y revocación masiva (logout). Integrado en `AuthService`.
  - Política opcional de sesiones por dispositivo (`AUTH_MAX_SESSIONS`) con revocación de tokens antiguos.
- **Swagger (completado)**
  - Tags, esquemas de seguridad para access/refresh y DTOs de respuesta explícitos con ejemplos en `auth`, `restaurants` e `invites`.

## Prioridades inmediatas
1) Menú y Carta (backend)
   - Modelos Prisma: `Menu`, `MenuSection`, `MenuItem`.
   - Endpoints CRUD con scoping por `restaurantId`. Permisos: `OWNER/MANAGER` editan; `WAITER` lectura.
2) Pedidos (Orders)
   - Modelos `Order`, `OrderItem`, `OrderEvent`. Endpoints para crear/actualizar estado y añadir ítems.
3) Pruebas E2E negativas
   - RBAC por restaurante, validaciones y expiración de invitaciones.
4) Suscripciones (solo backend)
   - Modelos `Plan`, `Subscription`, `UsageCounter` y alambres básicos (sin pagos).
5) Deploy y entornos
   - `.env` por entorno, Dockerfile, CI (lint/test/migrate) y staging.

## Progreso (2025-08-22)
- **[logros]**
  - Pedidos (Orders): agregados modelos Prisma `Order`, `OrderItem`, `OrderEvent` con back-relations, migración aplicada y Prisma Client regenerado.
  - Backend: creado `OrdersModule` (`src/orders/`) con service, controller y DTOs; rutas `v1/restaurants/:id/orders/*` con guards (`JwtAuthGuard`, `RestaurantAccessGuard`) y RBAC por rol del restaurante.
  - Prisma: `bun run prisma:generate`, `bun run prisma:migrate --name add_orders`, `bun run prisma:seed` ejecutados.
  - Configuración: migrado a `prisma.config.ts` y actualización de scripts para cargar `.env` con `dotenv-cli` (generate/migrate/seed verificados).
  - Menús: `menus.controller.ts` refactorizado para usar tipos de Prisma (`MenuUpdateInput`, `MenuSectionUpdateInput`) sin `as any`.
- **[en curso]**
  - Menú y Carta: CRUD de `Menu`/`MenuSection`/`MenuItem` (backend) — en construcción.
  - Validaciones adicionales y ejemplos en Swagger para Orders.
  - E2E de Menús: cubrir flujos CRUD, validaciones 400/404 y RBAC OWNER/MANAGER/WAITER.
- **[próximos pasos]**
  - Pruebas E2E de Orders (casos positivos/negativos; transiciones de estado; recalculo de totales; RBAC por restaurante).
  - Verificar y ajustar DTOs/respuestas de Orders en Swagger.
  - Preparar CI (lint/test/migrate) y Dockerfile de backend.

---

## Fase 2 — Restaurantes y Meseros (Multi-tenant)
- Estado: Completado (modelos, guards y endpoints entregados; E2E core pasando).
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

## Fase 2.1 — Autenticación por restaurante y Branding del portal
- **Objetivo**: separar autenticación por restaurante (subdominio/domino propio) y permitir personalización básica del portal.
- **Modelos Prisma**
  - `RestaurantDomain`: `restaurantId`, `subdomain`, `customDomain`, `isPrimary`.
  - `Branding`: `restaurantId`, `logoUrl`, `primaryColor`, `secondaryColor`, `theme`, `updatedBy`.
  - `RestaurantApiKey` (opcional): integraciones por restaurante.
- **Backend**
  - Middleware/guard para resolver `restaurantContext` por dominio/subdominio.
  - Login contextual (opcional): endpoints que acepten `restaurantId` o derivado del host.
  - Endpoints CRUD para Branding y Domain.

## Fase 3 — Menú y Carta
- **Modelos Prisma**: `Menu`, `MenuSection`, `MenuItem` (precio, estado, tags, orden).
- **Endpoints**: CRUD de menús, secciones e ítems, con scoping por `restaurantId`.
- **Permisos**: `OWNER`/`MANAGER` editan; `WAITER` lectura.

## Fase 4 — Pedidos (Orders)
- **Modelos Prisma**: `Order` (restaurantId, mesa/área, estado), `OrderItem` (menuItemId, qty, priceSnapshot), `OrderEvent`.
- **Flujo**: crear pedido, añadir ítems, estados (nuevo → preparación → servido → cerrado).
- **Endpoints**: `POST/GET/PATCH /restaurants/:id/orders`, `POST /orders/:id/items`, `PATCH /orders/:id/status`.

## Fase 4.1 — Mesas (Tables) y Reservas
- **Modelos Prisma**
  - `Table`: `restaurantId`, `code`/`number`, `name`, `area`, `capacity`, `status` (`AVAILABLE|OCCUPIED|RESERVED`), `qrCodeUrl` (opcional).
  - `TableSession`: `tableId`, `openedBy`, `openedAt`, `closedAt`, `currentOrderId` (opcional).
  - `Reservation`: `restaurantId`, `tableId` (opcional), `customerName`, `partySize`, `startAt`, `endAt`, `status`.
- **Backend**
  - Endpoints CRUD para mesas y reservas, y apertura/cierre de sesión de mesa.
  - Integración con `Order`/`OrderItem` cuando hay `TableSession` activa.

## Fase 4.2 — Delivery en tiempo real
- **Modelos Prisma**
- `DeliveryOrder`: `orderId`, `customerName`, `phone`, `address`, `geo`, `deliveryStatus` (pipeline), `assignedCourierId` (opcional).
  - `DeliveryEvent`: `deliveryOrderId`, `type`, `data`, `at`.
  - `Courier` (opcional): `name`, `phone`, `vehicle`, `status`.
- **Tiempo real**
  - NestJS Gateway (WebSocket) y/o SSE para notificaciones y tracking.
  - Pub/Sub (Redis) para escalar eventos.
- **Endpoints**
  - Crear delivery, actualizar estado, asignar repartidor, feed de eventos.

## Fase 4.3 — POS (punto de venta)
- **Modelos Prisma**
  - `PosTerminal`: `restaurantId`, `name`, `deviceId`, `status`.
  - `CashSession`: `restaurantId`, `terminalId`, `openedBy`, `openedAt`, `closedAt`, `openingAmount`, `closingAmount`.
  - `Payment`: `orderId`, `amount`, `currency`, `method` (`CASH|CARD|ONLINE|OTHER`), `tipAmount`, `changeGiven`, `status`, `txRef`.
  - `TaxRate`/`Discount` (opcional a futuro).
- **Backend**
  - Apertura/cierre de caja, registro de pagos, conciliación básica.
  - Reportes simples por sesión de caja/terminal.

## Fase 5 — Inventario
- **Modelos Prisma**
  - `Product`: `restaurantId`, `sku`, `name`, `unit`, `reorderLevel`.
  - `StockItem`: `productId`, `location`/`warehouse`, `onHand`.
  - `StockMovement`: `productId`, `type` (`IN|OUT|ADJUST`), `qty`, `reason`, `ref`.
  - (Opcional) `Supplier`, `PurchaseOrder`.
- **Integración con Menú**
  - Relación `MenuItem -> Product` (consumo) o receta básica.
- **Backend**
  - Endpoints CRUD y movimientos de stock; hooks al cerrar/servir pedido para descontar stock.

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
