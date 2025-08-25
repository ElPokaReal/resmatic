'use strict';

const readline = require('readline');
const net = require('net');
const { spawn } = require('child_process');
const { printBanner, RESET, BOLD, CYAN, YELLOW, GREEN, BRIGHT_WHITE, BRIGHT_CYAN } = require('./banner.cjs');
const { TASKS, buildCommand } = require('./tasks.cjs');
const { readConfig, readFavs, writeFavs, readState, writeState } = require('./config.cjs');

const CLEAR = '\x1B[2J\x1B[0f';
const INVERSE = '\x1b[7m';
const DIM = '\x1b[2m';
const GRAY = '\x1b[90m';
const RED = '\x1b[31m';

// Estado global de servicios
const STATUS = { server: null, web: null };

function formatStatus(val) {
  if (val === true) return `${GREEN}Activo${RESET}`;
  if (val === false) return `${GRAY}Inactivo${RESET}`;
  return `${YELLOW}...${RESET}`;
}

function checkPort(host, port, timeout = 700) {
  return new Promise((resolve) => {
    if (!port) return resolve(false);
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => { if (done) return; done = true; try { socket.destroy(); } catch (_) {} resolve(ok); };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try { socket.connect(port, host); } catch (_) { finish(false); }
  });
}

function clearScreen() { process.stdout.write(CLEAR); }

let CFG = null; // se inicializa en interactiveMenu

function drawMenu(opts, index, title = 'Menú principal', ui = {}) {
  clearScreen();
  const current = opts[index];
  // Mostrar solo la descripción debajo de RESMATIC CLI
  const profileLine = CFG && CFG.profile ? `Perfil: ${CFG.profile}` : '';
  printBanner(profileLine, current ? current.desc : '');
  console.log(`${BOLD}Controles:${RESET} ↑/↓ Enter • Esc/b volver • q salir • / filtrar • F favs • v vista • y copiar cmd • C modo copia • ? ayuda`);
  console.log(`${BOLD}Estado del Servidor:${RESET} ${formatStatus(STATUS.server)}   ${BOLD}Estado del Sitio Web:${RESET} ${formatStatus(STATUS.web)}`);
  if (ui.filterActive) {
    console.log(`${BOLD}Filtro:${RESET} / ${ui.filterText || ''}`);
  }
  if (ui.compact) {
    console.log(`${DIM}(Vista compacta: 'v' para alternar)${RESET}`);
  }
  console.log(`\n${BOLD}Tareas disponibles:${RESET}`);
  opts.forEach((o, i) => {
    const isSel = i === index;
    const prefix = isSel ? `${BRIGHT_CYAN}❯${RESET}` : `${GRAY}·${RESET}`;
    const isFav = ui.favs && ui.favs.includes(o.name);
    const star = isFav ? '★ ' : '';
    const badge = (() => {
      if (!CFG) return '';
      if (o.name === 'backend') {
        const port = CFG?.ports?.backend;
        const dot = STATUS.server ? `${GREEN}●${RESET}` : `${GRAY}●${RESET}`;
        return port ? `  ${dot}${DIM}${port}${RESET}` : '';
      }
      if (o.name === 'frontend') {
        const port = CFG?.ports?.frontend;
        const dot = STATUS.web ? `${GREEN}●${RESET}` : `${GRAY}●${RESET}`;
        return port ? `  ${dot}${DIM}${port}${RESET}` : '';
      }
      return '';
    })();
    const label = ui.compact
      ? `${star}${o.name}`
      : `${star}${o.name}${DIM}${o.desc ? '  —  ' + o.desc : ''}${RESET}`;
    const name = isSel ? `${BOLD}${BRIGHT_WHITE}${label}${RESET}` : `${DIM}${label}${RESET}`;
    // Separadores visuales
    if (!ui.filterActive && (o.name === 'prisma ▸' || o.name === 'docker ▸')) {
      console.log(`${DIM}  ─────────────────────────────────────────────${RESET}`);
    }
    console.log(`  ${prefix} ${name}${badge}`);
  });
  console.log('\n' + `${YELLOW}Tip:${RESET} también puedes ejecutar: node scripts/resmatic-cli.cjs <comando>`);

}

function drawHelp(ui = {}) {
  clearScreen();
  printBanner('Ayuda', 'Atajos rápidos y funciones');
  const lines = [
    `${BOLD}Navegación:${RESET} ↑/↓ para moverte, Enter para seleccionar, Esc/b para volver`,
    `${BOLD}Salir:${RESET} q`,
    `${BOLD}Búsqueda:${RESET} / para activar, escribe para filtrar, Esc para limpiar`,
    `${BOLD}Favoritos:${RESET} F para marcar/desmarcar (persisten)`,
    `${BOLD}Vistas:${RESET} v alterna vista compacta/extendida (se recuerda)`,
    `${BOLD}Copiar comando:${RESET} y copia el comando; ${BOLD}Modo copia:${RESET} C`,
    `${BOLD}Submenús rápidos:${RESET} p Prisma • d Docker • b Backend • f Frontend • e E2E`,
    `${BOLD}Estados:${RESET} Se muestran badges y estados de puertos (auto-refresco)`,
    '',
    `${DIM}Presiona cualquier tecla para volver al menú...${RESET}`,
  ];
  console.log(lines.join('\n'));
}

function interactiveMenu(runTask) {
  const rootOptions = [
    { name: 'backend', desc: TASKS['backend'].desc },
    { name: 'frontend', desc: TASKS['frontend'].desc },
    { name: 'e2e', desc: TASKS['e2e'].desc },
    { name: 'dev:full', desc: TASKS['dev:full'].desc },
    { name: 'prisma ▸', desc: 'Prisma (generate / migrate / seed)' },
    { name: 'docker ▸', desc: 'Docker Compose (up/logs/down/build)' },
    { name: 'abrir-localhost', desc: TASKS['abrir-localhost'].desc },
  ];
  const prismaOptions = [
    { name: 'prisma:flow', desc: TASKS['prisma:flow'].desc },
    { name: 'prisma:studio', desc: TASKS['prisma:studio'].desc },
    { name: 'prisma:doctor', desc: TASKS['prisma:doctor'].desc },
    { name: 'prisma:generate', desc: TASKS['prisma:generate'].desc },
    { name: 'prisma:migrate', desc: TASKS['prisma:migrate'].desc },
    { name: 'prisma:seed', desc: TASKS['prisma:seed'].desc },
    { name: '« volver', desc: 'Regresar al menú principal' },
  ];
  const dockerOptions = [
    { name: 'docker:up', desc: TASKS['docker:up'].desc },
    { name: 'docker:logs', desc: TASKS['docker:logs'].desc },
    { name: 'docker:down', desc: TASKS['docker:down'].desc },
    { name: 'docker:rebuild', desc: TASKS['docker:rebuild'].desc },
    { name: '« volver', desc: 'Regresar al menú principal' },
  ];

  let current = 'root';
  let options = rootOptions;
  let index = 0;
  CFG = readConfig();
  const state = readState();
  let favs = readFavs();
  let filterActive = false;
  let filterText = '';
  let compact = !!state.compact;
  const ui = { favs, filterActive, filterText, compact };

  function applyStateDefaults() {
    // Restaurar última selección por menú
    if (current === 'root' && state.lastRoot) {
      const i = options.findIndex(o => o.name === state.lastRoot);
      index = i >= 0 ? i : 0;
    }
    if (current === 'prisma' && state.lastPrisma) {
      const i = options.findIndex(o => o.name === state.lastPrisma);
      index = i >= 0 ? i : 0;
    }
    if (current === 'docker' && state.lastDocker) {
      const i = options.findIndex(o => o.name === state.lastDocker);
      index = i >= 0 ? i : 0;
    }
  }

  function buildView() {
    // Ordenar favoritos primero
    const favSet = new Set(favs);
    const base = options.slice();
    const runnable = base.filter(o => TASKS[o.name]);
    const submenus = base.filter(o => !TASKS[o.name]);
    const favsPart = runnable.filter(o => favSet.has(o.name));
    const restPart = runnable.filter(o => !favSet.has(o.name));
    let merged = [...favsPart, ...restPart, ...submenus];
    // Filtrar si hay filtro
    if (filterActive && filterText) {
      const q = filterText.toLowerCase();
      merged = merged.filter(o => o.name.toLowerCase().includes(q) || (o.desc||'').toLowerCase().includes(q));
    }
    // Ajustar índice si se sale de rango
    if (index >= merged.length) index = Math.max(0, merged.length - 1);
    return merged;
  }

  applyStateDefaults();
  let view = buildView();
  drawMenu(view, index, 'Menú principal', { favs, filterActive, filterText, compact });

  // raw mode para capturar teclas
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  let COPY_MODE = false;
  let HELP = false;
  const serverPort = CFG.ports && CFG.ports.backend;
  const webPort = CFG.ports && CFG.ports.frontend;
  let statusTimer = null;

  async function refreshStatus() {
    if (COPY_MODE || HELP) return; // evita redibujar mientras copia o ayuda
    const [s, w] = await Promise.all([
      checkPort('127.0.0.1', serverPort),
      checkPort('127.0.0.1', webPort),
    ]);
    STATUS.server = s;
    STATUS.web = w;
    view = buildView();
    drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
  }
  // primer chequeo y temporizador
  refreshStatus();
  statusTimer = setInterval(refreshStatus, 2000);

  function cleanup() {
    try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch (_) {}
    process.stdin.removeAllListeners('data');
    if (statusTimer) clearInterval(statusTimer);
  }

  let confirmTask = null; // para docker:down / docker:rebuild

  function copyToClipboard(text) {
    const platform = process.platform;
    if (platform === 'win32') {
      const p = spawn('clip');
      p.stdin.end(Buffer.from(text, 'utf8'));
      return;
    }
    const pb = spawn('pbcopy');
    pb.stdin.end(Buffer.from(text, 'utf8'));
  }

  process.stdin.on('data', (buf) => {
    const s = buf.toString();
    // Confirmaciones pendientes
    if (confirmTask) {
      if (s.toLowerCase() === 'y') {
        const chosen = confirmTask; confirmTask = null;
        // Guardar última selección
        if (current === 'root') { state.lastRoot = chosen; }
        if (current === 'prisma') { state.lastPrisma = chosen; }
        if (current === 'docker') { state.lastDocker = chosen; }
        writeState(state);
        if (chosen === 'abrir-localhost') {
          runTask('abrir-localhost', { detached: true, interactive: true });
        } else {
          runTask(chosen, { detached: true, interactive: true });
        }
        console.log(`\n${GREEN}Lanzado:${RESET} ${chosen} ${process.platform==='win32' ? '(nueva ventana)' : ''}`);
        setTimeout(() => { view = buildView(); drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact }); }, 500);
        return;
      } else {
        console.log(`${YELLOW}Cancelado.${RESET}`);
        confirmTask = null;
        return;
      }
    }
    if (HELP) {
      HELP = false;
      view = buildView();
      drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
      return;
    }
    if (COPY_MODE) {
      if (s === '\r' || s === '\n') {
        COPY_MODE = false;
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        view = buildView();
        drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
      }
      return;
    }
    if (s === '\u0003') {
      console.log(`\n${YELLOW}Para salir usa 'q'. Para copiar presiona 'C'.${RESET}`);
      return;
    }
    if (s.toLowerCase() === 'q') {
      cleanup();
      clearScreen();
      process.exit(0);
      return;
    }
    // Ayuda
    if (s === '?') {
      HELP = true;
      drawHelp({ favs, filterActive, filterText, compact });
      return;
    }
    // Activar filtro
    if (s === '/') {
      filterActive = true; filterText = '';
      view = buildView();
      drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
      return;
    }
    if (filterActive) {
      // ESC para salir del filtro
      if (s === '\u001B') { filterActive = false; filterText = ''; view = buildView(); drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact }); return; }
      // Backspace
      if (s === '\u0008' || s === '\u007F') { filterText = filterText.slice(0, -1); view = buildView(); drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact }); return; }
      // Enter ejecuta
      if (s === '\r' || s === '\n') { /* cae al manejador general */ } else {
        // Agregar carácter si es imprimible
        const ch = s.replace(/\r|\n/g, '');
        if (ch && ch >= ' ' && ch.length === 1) { filterText += ch; view = buildView(); drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact }); return; }
      }
    }
    if (s.toLowerCase() === 'c') {
      COPY_MODE = true;
      try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch (_) {}
      console.log(`\n${BOLD}Modo copia habilitado${RESET}. Selecciona texto con el mouse o usa Ctrl+Shift+C.\nPresiona Enter para volver al menú...`);
      return;
    }
    if (s === '\r' || s === '\n') {
      if (!view.length) return;
      const chosen = view[index].name;
      if (current === 'root' && chosen === 'prisma ▸') {
        current = 'prisma';
        options = prismaOptions;
        index = 0;
        state.lastMenu = 'prisma'; writeState(state);
        view = buildView();
        drawMenu(view, index, 'Prisma', { favs, filterActive, filterText, compact });
        return;
      }
      if (current === 'root' && chosen === 'docker ▸') {
        current = 'docker';
        options = dockerOptions;
        index = 0;
        state.lastMenu = 'docker'; writeState(state);
        view = buildView();
        drawMenu(view, index, 'Docker', { favs, filterActive, filterText, compact });
        return;
      }
      if (current === 'prisma' && chosen === '« volver') {
        current = 'root';
        options = rootOptions;
        index = 0;
        state.lastMenu = 'root'; writeState(state);
        view = buildView();
        drawMenu(view, index, 'Menú principal', { favs, filterActive, filterText, compact });
        return;
      }
      if (current === 'docker' && chosen === '« volver') {
        current = 'root';
        options = rootOptions;
        index = 0;
        state.lastMenu = 'root'; writeState(state);
        view = buildView();
        drawMenu(view, index, 'Menú principal', { favs, filterActive, filterText, compact });
        return;
      }
      // Confirmación para tareas peligrosas
      if (chosen === 'docker:down' || chosen === 'docker:rebuild') {
        confirmTask = chosen;
        console.log(`\n${RED}¿Seguro que deseas ejecutar '${chosen}'?${RESET} y/N`);
        return;
      }
      // Guardar última selección
      if (current === 'root') { state.lastRoot = chosen; }
      if (current === 'prisma') { state.lastPrisma = chosen; }
      if (current === 'docker') { state.lastDocker = chosen; }
      writeState(state);
      // Ejecutar
      if (chosen === 'abrir-localhost') {
        runTask('abrir-localhost', { detached: true, interactive: true });
      } else {
        runTask(chosen, { detached: true, interactive: true });
      }
      console.log(`\n${GREEN}Lanzado:${RESET} ${chosen} ${process.platform==='win32' ? '(nueva ventana)' : ''}`);
      setTimeout(() => { view = buildView(); drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact }); }, 500);
      return;
    }
    if (s === '\u001B[A' || s === 'k') {
      index = (index - 1 + Math.max(1, view.length)) % Math.max(1, view.length);
      drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
      return;
    }
    if (s === '\u001B[B' || s === 'j') {
      index = view.length ? (index + 1) % view.length : 0;
      drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
      return;
    }
    if (s === '\u001B' || s === 'b' || s === 'B') {
      if (current === 'prisma' || current === 'docker') {
        current = 'root';
        options = rootOptions;
        index = 0;
        view = buildView();
        drawMenu(view, index, 'Menú principal', { favs, filterActive, filterText, compact });
      }
      return;
    }
    // Alternar vista compacta
    if (s.toLowerCase() === 'v') {
      compact = !compact;
      state.compact = compact; writeState(state);
      view = buildView();
      drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
      return;
    }
    // Copiar comando
    if (s.toLowerCase() === 'y') {
      if (!view.length) return;
      const chosen = view[index].name;
      const cmd = `node scripts/resmatic-cli.cjs ${chosen}`;
      copyToClipboard(cmd);
      console.log(`\n${GREEN}Comando copiado:${RESET} ${cmd}`);
      return;
    }
    // Favoritos: usar 'F' para evitar conflicto con 'f' (frontend)
    if (s === 'F') {
      if (!view.length) return;
      const name = view[index].name;
      if (!TASKS[name]) return; // no submenús
      if (favs.includes(name)) favs = favs.filter(n => n !== name); else favs = [...favs, name];
      writeFavs(favs);
      view = buildView();
      drawMenu(view, index, current === 'prisma' ? 'Prisma' : 'Menú principal', { favs, filterActive, filterText, compact });
      return;
    }
    // Teclas rápidas (solo en root, y si no está activo el filtro)
    if (!filterActive && current === 'root') {
      const lower = s.toLowerCase();
      if (lower === 'b' || lower === 'f' || lower === 'e') {
        const name = lower === 'b' ? 'backend' : lower === 'f' ? 'frontend' : 'e2e';
        const i = view.findIndex(o => o.name === name);
        if (i >= 0) {
          index = i; drawMenu(view, index, 'Menú principal', { favs, filterActive, filterText, compact });
          return;
        }
      }
      if (lower === 'p') {
        current = 'prisma'; options = prismaOptions; index = 0; view = buildView(); drawMenu(view, index, 'Prisma', { favs, filterActive, filterText, compact }); return;
      }
      if (lower === 'd') {
        current = 'docker'; options = dockerOptions; index = 0; view = buildView(); drawMenu(view, index, 'Docker', { favs, filterActive, filterText, compact }); return;
      }
    }
  });
}

module.exports = { interactiveMenu };
