#!/usr/bin/env node
'use strict';

// ResMatic CLI: orquesta tareas comunes con Bun
// Uso:
//   node scripts/resmatic-cli.cjs <comando>
// Comandos:
//   e2e                 Ejecutar tests E2E (resmatic-server)
//   backend             Ejecutar backend NestJS (start:dev)
//   frontend            Ejecutar frontend Next.js (dev)
//   prisma:generate     Ejecutar Prisma Generate
//   prisma:migrate      Ejecutar Prisma Migrate (dev)
//   prisma:seed         Ejecutar Prisma Seed

const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// --- Banner minimal inspirado en scripts/banner.cjs ---
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BRIGHT_WHITE = '\x1b[97m';
const BRIGHT_CYAN = '\x1b[96m';

const BOX_WIDTH = 64;
const INNER = BOX_WIDTH - 2;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const header = `${BOLD}${CYAN}╔${'═'.repeat(INNER)}╗${RESET}`;
const footer = `${BOLD}${CYAN}╚${'═'.repeat(INNER)}╝${RESET}`;
const box = (s = '') => {
  const visible = stripAnsi(s);
  const len = visible.length;
  const left = Math.max(0, Math.floor((INNER - len) / 2));
  const right = Math.max(0, INNER - len - left);
  return `${BOLD}${CYAN}║${RESET}` + ' '.repeat(left) + s + ' '.repeat(right) + `${BOLD}${CYAN}║${RESET}`;
};

const PIZZA = [
  `        _....._`,
  `    _.:\`.--|--.\`:_`,
  `  .: .'\\o ^ | o*/~'. '.`,
  ` // '.  \\ o| ^/  o* x'.\\`,
  `//'._o'. \\ |o/ o^~_.-'o*\\\\`,
  `|| o* '-.'.\\|/.-' o ^ x ||`,
  `||--o-^o-*~->|`,
];
const maxPizzaWidth = Math.max(...PIZZA.map((l) => l.length));
const pizzaLeft = Math.max(0, Math.floor((INNER - maxPizzaWidth) / 2));
const colorizePizza = (line) => line
  .replace(/o/g, `${YELLOW}o${RESET}`)
  .replace(/\^/g, `${GREEN}^${RESET}`)
  .replace(/\*/g, `${MAGENTA}*${RESET}`);
const boxLeft = (s = '', leftPadding = 0) => {
  const visible = stripAnsi(s);
  const len = visible.length;
  const left = Math.max(0, leftPadding);
  const right = Math.max(0, INNER - left - len);
  return `${BOLD}${CYAN}║${RESET}` + ' '.repeat(left) + s + ' '.repeat(right) + `${BOLD}${CYAN}║${RESET}`;
};

function printBanner(title, subtitle) {
  const nets = os.networkInterfaces();
  const lan = Object.values(nets).flatMap((ifs) => ifs || []).find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  const lines = [
    '',
    header,
    box(`${BRIGHT_CYAN}┌──────────────────┐${RESET}`),
    box(`${BRIGHT_CYAN}│  ${BOLD}${BRIGHT_WHITE}RESMATIC${RESET}  ${BRIGHT_CYAN}     │${RESET}`),
    box(`${BRIGHT_CYAN}└──────────────────┘${RESET}`),
    box(`${BOLD}${BRIGHT_WHITE}RESMATIC CLI${RESET}`),
    box(`${MAGENTA}${title}${RESET}`),
    box(`${YELLOW}${subtitle || ''}${RESET}`),
    box(),
    ...PIZZA.map((l) => boxLeft(colorizePizza(l), pizzaLeft)),
    footer,
    '',
  ];
  console.log(lines.join('\n'));
}

// --- Mapeo de tareas ---
const root = path.join(__dirname, '..');
const serverDir = path.join(root, 'resmatic-server');
const appDir = path.join(root, 'resmatic-app');

const TASKS = {
  'e2e': { cwd: serverDir, cmd: 'bun', args: ['run', 'test:e2e'] },
  'backend': { cwd: serverDir, cmd: 'bun', args: ['run', 'start:dev'] },
  'frontend': { cwd: appDir, cmd: 'bun', args: ['run', 'dev'] },
  'prisma:generate': { cwd: serverDir, cmd: 'bun', args: ['run', 'prisma:generate'] },
  'prisma:migrate': { cwd: serverDir, cmd: 'bun', args: ['run', 'prisma:migrate'] },
  'prisma:seed': { cwd: serverDir, cmd: 'bun', args: ['run', 'prisma:seed'] },
};

function usage() {
  console.log(`\n${BOLD}Uso:${RESET} node scripts/resmatic-cli.cjs <comando>\n`);
  console.log(`Comandos disponibles:`);
  Object.keys(TASKS).forEach((k) => console.log(`  - ${k}`));
  console.log('\nEjemplos:');
  console.log('  node scripts/resmatic-cli.cjs backend');
  console.log('  node scripts/resmatic-cli.cjs frontend');
  console.log('  node scripts/resmatic-cli.cjs e2e');
  console.log('  node scripts/resmatic-cli.cjs prisma:generate');
  console.log('');
}

function runTask(name) {
  const t = TASKS[name];
  if (!t) {
    usage();
    process.exitCode = 1;
    return;
  }

  printBanner(`Ejecutando: ${name}`, `${t.cwd.replace(root + path.sep, '')}`);

  const child = spawn(t.cmd, t.args, {
    cwd: t.cwd,
    stdio: 'inherit',
    shell: true, // Windows friendly
    env: process.env,
  });

  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach((sig) => {
    process.on(sig, () => child.kill(sig));
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

const [, , taskName] = process.argv;
if (!taskName) {
  usage();
  process.exit(0);
} else {
  runTask(taskName);
}
