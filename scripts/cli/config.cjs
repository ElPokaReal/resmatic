'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const serverDir = path.join(root, 'resmatic-server');
const appDir = path.join(root, 'resmatic-app');

const CONFIG_PATH = path.join(root, '.resmaticrc.json');
const FAVS_PATH = path.join(root, '.resmatic-favs.json');
const STATE_PATH = path.join(root, '.resmatic-state.json');
const DEFAULTS = {
  terminal: 'auto', // auto | powershell | windows_terminal
  windows_terminal: {
    layout: 'tabs', // tabs | panes
    titlePrefix: 'ResMatic - '
  },
  ports: { frontend: 3000, backend: 3001, docsPath: '/docs' },
  autoOpen: ['frontend', 'backend', 'docs'],
  profile: 'dev',
  profiles: {}
};

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const cfg = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...cfg,
        windows_terminal: { ...DEFAULTS.windows_terminal, ...(cfg.windows_terminal || {}) },
        ports: { ...DEFAULTS.ports, ...(cfg.ports || {}) },
      };
    }
  } catch (_) {}
  return DEFAULTS;
}

function parseEnvFile(filePath) {
  const env = {};
  try {
    if (!filePath) return env;
    const full = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
    if (!fs.existsSync(full)) return env;
    const content = fs.readFileSync(full, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const l = line.trim();
      if (!l || l.startsWith('#')) return;
      const eq = l.indexOf('=');
      if (eq === -1) return;
      const key = l.slice(0, eq).trim();
      let val = l.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    });
  } catch (_) {}
  return env;
}

function getProfileEnv() {
  const cfg = readConfig();
  const name = cfg.profile;
  const p = (cfg.profiles && cfg.profiles[name]) || {};
  const fromFile = parseEnvFile(p.envFile || p.envfile || p.dotenv);
  return { ...fromFile, ...(p.env || {}) };
}

function hasWindowsTerminal() {
  if (process.platform !== 'win32') return false;
  try {
    const r = spawnSync('where', ['wt'], { stdio: 'ignore' });
    return r.status === 0;
  } catch (_) {
    return false;
  }
}

function readFavs() {
  try {
    if (fs.existsSync(FAVS_PATH)) {
      const raw = fs.readFileSync(FAVS_PATH, 'utf8');
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch (_) {}
  return [];
}

function writeFavs(favsArray) {
  try {
    const unique = Array.from(new Set(favsArray || []));
    fs.writeFileSync(FAVS_PATH, JSON.stringify(unique, null, 2), 'utf8');
  } catch (_) {}
}

function readState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const raw = fs.readFileSync(STATE_PATH, 'utf8');
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    }
  } catch (_) {}
  return {};
}

function writeState(stateObj) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(stateObj || {}, null, 2), 'utf8');
  } catch (_) {}
}

module.exports = {
  root,
  serverDir,
  appDir,
  CONFIG_PATH,
  FAVS_PATH,
  STATE_PATH,
  DEFAULTS,
  readConfig,
  hasWindowsTerminal,
  getProfileEnv,
  readFavs,
  writeFavs,
  readState,
  writeState,
};
