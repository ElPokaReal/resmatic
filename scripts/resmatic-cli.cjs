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
const { spawn } = require('child_process');
const { root, serverDir, appDir, readConfig, hasWindowsTerminal, getProfileEnv } = require('./cli/config.cjs');
const { printBanner, RESET, BOLD } = require('./cli/banner.cjs');
const { openUrl, waitForHttp, openWhenReady } = require('./cli/utils.cjs');
const { launchInWindowsTerminal, launchInNewTerminal, launchWTWithPanes } = require('./cli/launcher.cjs');
const { interactiveMenu } = require('./cli/menu.cjs');
const { TASKS } = require('./cli/tasks.cjs');

// Estado global para saber si estamos en modo menú interactivo
let INTERACTIVE = false;
const IS_WIN = process.platform === 'win32';

// Banner importado desde scripts/cli/banner.cjs

// Lanza el flujo guiado de Prisma en nueva ventana (Windows)
function launchPrismaFlowNewTerminal() {
  const wd = serverDir;
  if (IS_WIN) {
    const ps = 'powershell';
    const wdQuoted = wd.replace(/'/g, "''");
    const envVars = getProfileEnv();
    const envPrefix = Object.entries(envVars).map(([k,v]) => `$env:${k}='${String(v).replace(/'/g, "''")}';`).join(' ');
    const bunHome = process.env.BUN_INSTALL || (process.env.USERPROFILE ? `${process.env.USERPROFILE}\\.bun` : '');
    const bunBin = bunHome ? `${bunHome}\\bin` : '';
    const bunPathFix = bunBin ? `$env:Path=\"$env:Path;${bunBin.replace(/\\/g, '\\\\')}\"; ` : '';
    const scriptParts = [
      `${envPrefix} ${bunPathFix}Set-Location -LiteralPath '${wdQuoted}'`,
      `Write-Host 'Prisma Flow: generate → migrate → seed' -ForegroundColor Cyan`,
      `Write-Host ''`,
      `Read-Host 'Paso 1: prisma:generate (Enter para continuar)'`,
      `bun run prisma:generate`,
      `if ($LASTEXITCODE -ne 0) { Write-Host 'Error en generate' -ForegroundColor Red; exit $LASTEXITCODE }`,
      `Read-Host 'Paso 2: prisma:migrate (Enter para continuar)'`,
      `bun run prisma:migrate`,
      `if ($LASTEXITCODE -ne 0) { Write-Host 'Error en migrate' -ForegroundColor Red; exit $LASTEXITCODE }`,
      `Read-Host 'Paso 3: prisma:seed (Enter para continuar)'`,
      `bun run prisma:seed`,
      `if ($LASTEXITCODE -ne 0) { Write-Host 'Error en seed' -ForegroundColor Red; exit $LASTEXITCODE }`,
      `Write-Host 'Flujo completado ✅' -ForegroundColor Green`
    ];
    const psCommand = scriptParts.join('; ');
    const child = spawn('cmd', ['/c', 'start', '', ps, '-NoExit', '-NoLogo', '-NoProfile', '-Command', psCommand], {
      stdio: 'ignore',
      detached: true,
      shell: true,
    });
    child.unref();
  } else {
    // Otros SO: ejecutar en background sin pausas (el usuario puede abrir una terminal manualmente si quiere interacción)
    const shell = process.platform === 'darwin' ? 'bash' : 'sh';
    const cmd = `cd '${wd}'; echo 'Prisma Flow: generate → migrate → seed'; bun run prisma:generate && bun run prisma:migrate && bun run prisma:seed && echo 'Flujo completado ✅'`;
    const child = spawn(shell, ['-lc', cmd], { stdio: 'ignore', detached: true, shell: true });
    child.unref();
  }
}

// --- Mapeo de tareas importado desde scripts/cli/tasks.cjs ---

function usage() {
  console.log(`\n${BOLD}Uso:${RESET} node scripts/resmatic-cli.cjs <comando>\n`);
  console.log(`Comandos disponibles:`);
  Object.keys(TASKS).forEach((k) => console.log(`  - ${k}`));
  console.log('\nEjemplos:');
  console.log('  node scripts/resmatic-cli.cjs backend');
  console.log('  node scripts/resmatic-cli.cjs frontend');
  console.log('  node scripts/resmatic-cli.cjs e2e');
  console.log('  node scripts/resmatic-cli.cjs abrir-localhost');
  console.log('  node scripts/resmatic-cli.cjs prisma:generate');
  console.log('  node scripts/resmatic-cli.cjs prisma:flow');
  console.log('  node scripts/resmatic-cli.cjs prisma:studio');
  console.log('  node scripts/resmatic-cli.cjs prisma:doctor');
  console.log('  node scripts/resmatic-cli.cjs dev:full');
  console.log('');
}
// Menú interactivo importado desde scripts/cli/menu.cjs

// Launcher importado desde scripts/cli/launcher.cjs

function openLocalUrls() {
  const cfg = readConfig();
  const f = `http://localhost:${cfg.ports.frontend}`;
  const b = `http://localhost:${cfg.ports.backend}`;
  const d = `${b}${cfg.ports.docsPath}`;
  [f, b, d].forEach((u) => openUrl(u));
}

function runTask(name, opts = { detached: false }) {
  const t = TASKS[name];
  if (!t) {
    usage();
    process.exitCode = 1;
    return;
  }

  // Acción especial para abrir URLs locales
  if (name === 'abrir-localhost') {
    openLocalUrls();
    if (!INTERACTIVE && !opts.detached) process.exit(0);
    return;
  }

  // Flujo guiado Prisma
  if (name === 'prisma:flow') {
    if (opts.detached || INTERACTIVE) {
      printBanner('Lanzando: prisma:flow', 'resmatic-server');
      launchPrismaFlowNewTerminal();
      return;
    }
    // Modo directo: ejecutar en la misma ventana, secuencialmente
    if (IS_WIN) {
      const ps = 'powershell';
      const wdQuoted = (serverDir || process.cwd()).replace(/'/g, "''");
      const bunHome = process.env.BUN_INSTALL || (process.env.USERPROFILE ? `${process.env.USERPROFILE}\\.bun` : '');
      const bunBin = bunHome ? `${bunHome}\\bin` : '';
      const bunPathFix = bunBin ? `$env:Path=\"$env:Path;${bunBin.replace(/\\/g, '\\\\')}\"; ` : '';
      const psCommand = `${bunPathFix}Set-Location -LiteralPath '${wdQuoted}'; bun run prisma:generate; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; bun run prisma:migrate; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; bun run prisma:seed`;
      const child = spawn(ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
        stdio: 'inherit',
        shell: true,
      });
      child.on('exit', (code) => process.exit(code ?? 0));
      return;
    } else {
      const shell = process.platform === 'darwin' ? 'bash' : 'sh';
      const cmd = `cd '${serverDir}'; set -e; bun run prisma:generate; bun run prisma:migrate; bun run prisma:seed`;
      const child = spawn(shell, ['-lc', cmd], { stdio: 'inherit', shell: true });
      child.on('exit', (code) => process.exit(code ?? 0));
      return;
    }
  }

  // Tarea compuesta: dev:full (lanza backend y frontend y abre URLs cuando estén listas)
  if (name === 'dev:full') {
    const cfg = readConfig();
    const backend = TASKS['backend'];
    const frontend = TASKS['frontend'];
    const titlePrefix = (cfg.windows_terminal && cfg.windows_terminal.titlePrefix) || 'ResMatic - ';
    const envVars = getProfileEnv();
    printBanner('Lanzando: dev:full', 'backend + frontend');
    const preferWT = cfg.terminal === 'windows_terminal' || (cfg.terminal === 'auto' && hasWindowsTerminal());
    if (preferWT && hasWindowsTerminal() && (cfg.windows_terminal.layout === 'panes')) {
      // Abrir ambos en un solo tab dividido en paneles
      launchWTWithPanes(backend, `${titlePrefix}backend`, frontend, `${titlePrefix}frontend`, 'H', envVars, envVars);
    } else {
      // Abrir en nuevas pestañas/ventanas
      launchInNewTerminal(backend, `${titlePrefix}backend`, envVars);
      launchInNewTerminal(frontend, `${titlePrefix}frontend`, envVars);
    }
    // Solo en modo interactivo hacemos auto-open con health-check
    if (INTERACTIVE) {
      if (cfg.autoOpen.includes('frontend')) openWhenReady(`http://localhost:${cfg.ports.frontend}`);
      if (cfg.autoOpen.includes('backend')) openWhenReady(`http://localhost:${cfg.ports.backend}`);
      if (cfg.autoOpen.includes('docs')) openWhenReady(`http://localhost:${cfg.ports.backend}${cfg.ports.docsPath}`);
    }
    return;
  }

  if (opts.detached || INTERACTIVE) {
    // No bloquear ni heredar stdio; abrir en nueva ventana
    const cfg = readConfig();
    const titlePrefix = (cfg.windows_terminal && cfg.windows_terminal.titlePrefix) || 'ResMatic - ';
    const envVars = getProfileEnv();
    printBanner(`Lanzando: ${name}`, `${t.cwd ? t.cwd.replace(root + path.sep, '') : ''}`);
    launchInNewTerminal(t, `${titlePrefix}${name}`, envVars);
    return;
  }

  // Modo directo (no interactivo): ejecutar en la misma ventana como antes
  printBanner(`Ejecutando: ${name}`, `${t.cwd ? t.cwd.replace(root + path.sep, '') : ''}`);
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
if (!taskName || taskName === 'menu' || taskName === 'interactive') {
  INTERACTIVE = true;
  interactiveMenu(runTask);
} else if (taskName === 'help' || taskName === '--help' || taskName === '-h') {
  usage();
  process.exit(0);
} else {
  runTask(taskName);
}
