import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Explicit schema path (defaults to prisma/schema.prisma)
  schema: path.join('prisma', 'schema.prisma'),

  // Keep default migrations path (prisma/migrations), configure seed command
  migrations: {
    // path: path.join('prisma', 'migrations'),
    seed: 'ts-node prisma/seed.ts',
  },
});
