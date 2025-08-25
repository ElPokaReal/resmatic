'use strict';

const { serverDir, appDir, root } = require('./config.cjs');

const TASKS = {
  'e2e': { cwd: serverDir, cmd: 'bun', args: ['run', 'test:e2e'], desc: 'Ejecutar pruebas end‑to‑end del backend' },
  'backend': { cwd: serverDir, cmd: 'bun', args: ['run', 'start:dev'], desc: 'Iniciar backend en modo desarrollo (NestJS)' },
  'frontend': { cwd: appDir, cmd: 'bun', args: ['run', 'dev'], desc: 'Iniciar frontend en modo desarrollo (Next.js)' },
  'prisma:generate': { cwd: serverDir, cmd: 'bun', args: ['run', 'prisma:generate'], desc: 'Generar el cliente Prisma desde el esquema' },
  'prisma:migrate': { cwd: serverDir, cmd: 'bun', args: ['run', 'prisma:migrate'], desc: 'Aplicar migraciones de Prisma (modo dev)' },
  'prisma:seed': { cwd: serverDir, cmd: 'bun', args: ['run', 'prisma:seed'], desc: 'Sembrar datos iniciales en la base de datos' },
  'prisma:flow': { cwd: serverDir, desc: 'Asistente: generate → migrate → seed (paso a paso)' },
  'prisma:studio': { cwd: serverDir, cmd: 'bunx', args: ['prisma', 'studio'], desc: 'Abrir Prisma Studio (UI de la base de datos)' },
  'prisma:doctor': { cwd: serverDir, cmd: 'bunx', args: ['prisma', 'doctor'], desc: 'Ejecutar diagnóstico del proyecto Prisma' },
  'dev:full': { desc: 'Levantar backend y frontend juntos (pestañas o paneles)' },
  'abrir-localhost': { desc: 'Abrir en el navegador: frontend, backend y Swagger' },
  // Docker
  'docker:up': { cwd: root, cmd: 'docker', args: ['compose', 'up', '-d'], desc: 'Arrancar servicios con Docker Compose (detached)' },
  'docker:logs': { cwd: root, cmd: 'docker', args: ['compose', 'logs', '-f', '--tail=300'], desc: 'Ver logs en vivo de Docker Compose' },
  'docker:down': { cwd: root, cmd: 'docker', args: ['compose', 'down'], desc: 'Detener y eliminar servicios de Docker Compose' },
  'docker:rebuild': { cwd: root, cmd: 'docker', args: ['compose', 'up', '--build', '--force-recreate', '-d'], desc: 'Reconstruir imágenes y arrancar (force recreate)' },
};

function buildCommand(t) {
  if (!t || !t.cmd) return null;
  return `${t.cmd} ${Array.isArray(t.args) ? t.args.join(' ') : ''}`.trim();
}

module.exports = { TASKS, buildCommand };
