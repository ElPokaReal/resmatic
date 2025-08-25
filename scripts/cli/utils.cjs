'use strict';

const { spawn } = require('child_process');

const IS_WIN = process.platform === 'win32';

function openUrl(u) {
  if (IS_WIN) {
    const c = spawn('cmd', ['/c', 'start', '', u], { stdio: 'ignore', detached: true, shell: true });
    c.unref();
  } else {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(opener, [u], { stdio: 'ignore', detached: true }).unref();
  }
}

function waitForHttp(url, { timeoutMs = 120000, intervalMs = 1000 } = {}) {
  const https = require('https');
  const http = require('http');
  const lib = url.startsWith('https') ? https : http;
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = lib.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(3000, () => { req.destroy(new Error('timeout')); });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
      setTimeout(attempt, intervalMs);
    };
    attempt();
  });
}

function openWhenReady(url) {
  waitForHttp(url).then(() => openUrl(url)).catch(() => {});
}

module.exports = {
  openUrl,
  waitForHttp,
  openWhenReady,
};
