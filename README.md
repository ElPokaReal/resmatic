# ResMatic

## Server
#### [Server](https://github.com/ElPokaReal/tree/main/resmatic-server)

## Client
#### [App](https://github.com/ElPokaReal/tree/main/resmatic-app)

---

## ¿Qué es ResMatic?

ResMatic es un gestor integral para restaurantes. Desde la toma de pedidos hasta la gestión de mesas, menús, inventario y reportes, busca centralizar la operación diaria en una plataforma moderna y rápida.

### Objetivos
- __Rapidez__: UI ágil y backend eficiente.
- __Operatividad__: flujo claro para meseros y cocina.
- __Escalabilidad__: modular para futuras integraciones (pagos, facturación, delivery, etc.).

## Arquitectura

- __Cliente__ (`resmatic-app/`): Next.js 15 + React 19 + Tailwind CSS 4.
- __Servidor__ (`resmatic-server/`): NestJS 11 (Express) con interceptores y configuración por `.env`.

```
ResMatic/
├─ resmatic-app/        # Frontend (Next.js)
└─ resmatic-server/     # API (NestJS)
```

## Pila tecnológica

- __Gestor de paquetes__: Bun (preferido)
- __Frontend__: Next.js, React, Tailwind CSS
- __Backend__: NestJS (Express), RxJS

## Requisitos

- Bun instalado: https://bun.sh
- Node (opcional, para tooling), Git

## Configuración rápida

1) Instala dependencias con Bun en cada proyecto:

```bash
cd resmatic-app && bun install
# en otra terminal
cd resmatic-server && bun install
```

2) Variables de entorno (API):

```bash
# dentro de resmatic-server/
Copy .env.example .env   # Windows PowerShell: Copy-Item .env.example .env -Force
```

Variables principales en `resmatic-server/.env`:
- `PORT` (default 3001)
- `NODE_ENV` = development | production
- `NEST_LOG_FORMAT` = tiny | short | full

## Ejecutar en desarrollo

- __Servidor__ (Nest):

```bash
cd resmatic-server
bun run start:dev
```

- __Cliente__ (Next):

```bash
cd resmatic-app
bun run dev
```

### Puertos y URLs locales

- App (Next): http://localhost:3000
- API (Nest): http://localhost:3001

## Scripts útiles

- `resmatic-server/`
  - `bun run start:dev` → desarrollo con watch
  - `bun run start` → modo normal
  - `bun run build` → compilar

- `resmatic-app/`
  - `bun run dev` → desarrollo
  - `bun run build` → build de producción
  - `bun run start` → servir build

## Logging de peticiones (API)

El proyecto usa un `LoggingInterceptor` global en `resmatic-server/src/common/interceptors/logging.interceptor.ts`.
Configura el nivel de detalle con `NEST_LOG_FORMAT`:

- `tiny`: `GET /items 200 12ms`
- `short` (por defecto): `GET /items 200 - 12ms`
- `full`: incluye `content-length`

## Roadmap (resumen)

- [ ] Autenticación/roles (admin, mesero, cocina)
- [ ] Gestión de mesas y órdenes en tiempo real
- [ ] Menú y modificadores
- [ ] Inventario básico y alertas
- [ ] Reportes (ventas, platos, meseros)
- [ ] Integraciones de pago y facturación

## Contribuir

1) Crea una rama desde `main` y abre PR con cambios acotados.
2) Añade contexto en el PR (qué problema resuelve, captura si aplica).
3) Mantén estilos de código (Prettier/ESLint) y tests si agregas lógica.

## Licencia

Pendiente de definir.