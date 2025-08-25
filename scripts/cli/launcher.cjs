'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { readConfig, hasWindowsTerminal } = require('./config.cjs');

const IS_WIN = process.platform === 'win32';

function scriptExistsForBunRun(t, wd) {
  try {
    const cmd = String(t.cmd || '').toLowerCase();
    const args = t.args || [];
    if (cmd !== 'bun') return true;
    if (args[0] !== 'run' || !args[1]) return true; // no es "bun run <script>"
    const pkgPath = path.join(wd, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return !!(pkg && pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, args[1]));
  } catch (_) { return true; }
}

function buildPsCommand(t, envVars = {}) {
  const wd = t.cwd || process.cwd();
  const wdQuoted = wd.replace(/'/g, "''");
  // Validar existencia de script cuando sea bun run <script>
  if (!scriptExistsForBunRun(t, wd)) {
    const missing = (t.args && t.args[1]) || '';
    const msg = `Write-Host 'Script "${missing}" no encontrado en package.json de ${wd}' -ForegroundColor Red`;
    return `$env:Path = \"$env:USERPROFILE\\.bun\\bin;$env:Path\"; Set-Location -LiteralPath '${wdQuoted}'; ${msg}; Read-Host 'Presiona Enter para cerrar'`;
  }
  const args = Array.isArray(t.args) ? t.args.join(' ') : '';
  return `$env:Path = \"$env:USERPROFILE\\.bun\\bin;$env:Path\"; Set-Location -LiteralPath '${wdQuoted}'; ${t.cmd} ${args}`;
}

function buildCmdCommand(t) {
  const wd = t.cwd || process.cwd();
  if (!scriptExistsForBunRun(t, wd)) {
    const missing = (t.args && t.args[1]) || '';
    // Mensaje con echo y pausa para cmd
    return `echo Script "${missing}" no encontrado en package.json de "${wd}" & pause`;
  }
  const args = Array.isArray(t.args) ? t.args.join(' ') : '';
  return `set "Path=%USERPROFILE%\\.bun\\bin;%Path%" && cd /d "${wd}" && ${t.cmd} ${args}`;
}

function getWinShell() {
  const cfg = readConfig();
  const shell = (cfg.windows_shell || cfg.shell || 'powershell').toLowerCase();
  return shell === 'cmd' ? 'cmd' : 'powershell';
}

function envPrefix(envVars = {}) {
  // Genera asignaciones para PowerShell: $env:KEY='value'; ...
  const entries = Object.entries(envVars);
  if (!entries.length) return '';
  return entries
    .map(([k, v]) => `$env:${k}='${String(v).replace(/'/g, "''")}';`)
    .join(' ');
}

function launchInWindowsTerminal(t, title, envVars = {}) {
  const wd = t.cwd || process.cwd();
  const shell = getWinShell();
  const cmdStr = shell === 'cmd' ? buildCmdCommand(t) : buildPsCommand(t);
  const args = ['new-tab'];
  if (title) args.push('--title', title);
  args.push('-d', wd);
  if (shell === 'cmd') {
    args.push('cmd', '/k', cmdStr);
  } else {
    args.push('powershell', '-NoExit', '-NoLogo', '-Command', cmdStr);
  }
  const child = spawn('wt', args, { stdio: 'ignore', detached: true, shell: false, env: { ...process.env, ...envVars } });
  child.unref();
}

function launchWTWithPanes(t1, title1, t2, title2, orientation = 'H', envVars1 = {}, envVars2 = {}) {
  const wd1 = t1.cwd || process.cwd();
  const wd2 = t2.cwd || process.cwd();
  const shell = getWinShell();
  const ps1 = shell === 'cmd' ? buildCmdCommand(t1) : buildPsCommand(t1);
  const ps2 = shell === 'cmd' ? buildCmdCommand(t2) : buildPsCommand(t2);
  // Construimos un único comando para wt con separadores ';'
  const cmd = [
    'wt',
    'new-tab', title1 ? `--title "${title1}"` : '', (shell === 'cmd' ? 'cmd' : 'powershell'), (shell === 'cmd' ? '/k' : '-NoExit'), (shell === 'cmd' ? '' : '-NoLogo'), (shell === 'cmd' ? '' : '-Command'), `"${ps1}"`,
    ';',
    `split-pane -${orientation}`, title2 ? `--title "${title2}"` : '', (shell === 'cmd' ? 'cmd' : 'powershell'), (shell === 'cmd' ? '/k' : '-NoExit'), (shell === 'cmd' ? '' : '-NoLogo'), (shell === 'cmd' ? '' : '-Command'), `"${ps2}"`
  ].filter(Boolean).join(' ');
  const child = spawn('cmd', ['/c', cmd], { stdio: 'ignore', detached: true, shell: true, env: { ...process.env, ...envVars1, ...envVars2 } });
  child.unref();
}

function launchInNewTerminal(t, title, envVars = {}) {
  if (IS_WIN) {
    const cfg = readConfig();
    const preferWT = cfg.terminal === 'windows_terminal' || (cfg.terminal === 'auto' && hasWindowsTerminal());
    if (preferWT && hasWindowsTerminal()) {
      return launchInWindowsTerminal(t, title, envVars);
    }
    const wd = t.cwd || process.cwd();
    const shell = getWinShell();
    if (shell === 'cmd') {
      const cmdCommand = buildCmdCommand(t);
      const child = spawn('cmd', ['/c', 'start', '', '/D', wd, 'cmd', '/k', cmdCommand], { stdio: 'ignore', detached: true, shell: true, env: { ...process.env, ...envVars } });
      child.unref();
    } else {
      const psCommand = buildPsCommand(t);
      const child = spawn('cmd', ['/c', 'start', '', '/D', wd, 'powershell', '-NoExit', '-NoLogo', '-Command', psCommand], { stdio: 'ignore', detached: true, shell: true, env: { ...process.env, ...envVars } });
      child.unref();
    }
  } else {
    const child = spawn(t.cmd, t.args, { cwd: t.cwd, stdio: 'ignore', detached: true, shell: true, env: { ...process.env, ...envVars } });
    child.unref();
  }
}

module.exports = {
  launchInWindowsTerminal,
  launchInNewTerminal,
  launchWTWithPanes,
};
