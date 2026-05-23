#!/usr/bin/env node
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');

const repo = '/Users/admin/.openclaw/workspace-vibe-coder/projects/lianlema-web';
const targetHost = '127.0.0.1';
const targetPort = 3000;
const listenHost = '0.0.0.0';
const listenPort = 3022;
const lanHost = process.env.LIANLEMA_LAN_HOST || '10.0.0.40';
const pidFile = '/tmp/lianlema-lan-dev.pid';

function killPort(port) {
  try {
    const out = execFileSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
    for (const pid of out.split(/\s+/).filter(Boolean)) {
      try { process.kill(Number(pid), 'SIGTERM'); } catch {}
    }
  } catch {}
}

async function waitFor(url, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve((res.statusCode || 0) < 500);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1500, () => { req.destroy(); resolve(false); });
      });
      if (ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function startProxy() {
  const server = http.createServer((req, res) => {
    const options = {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${targetHost}:${targetPort}`, origin: `http://${targetHost}:${targetPort}` },
    };
    const proxy = http.request(options, (upstream) => {
      const headers = { ...upstream.headers };
      headers['access-control-allow-origin'] = '*';
      headers['cache-control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
      headers.pragma = 'no-cache';
      headers.expires = '0';
      delete headers['content-security-policy'];
      res.writeHead(upstream.statusCode || 502, headers);
      upstream.pipe(res);
    });
    proxy.on('error', (error) => {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`lianlema proxy error: ${error.message}\n`);
    });
    req.pipe(proxy);
  });
  server.listen(listenPort, listenHost, () => {
    console.log(`练了吗 LAN: http://${lanHost}:${listenPort} -> http://${targetHost}:${targetPort}`);
  });
  return server;
}

(async () => {
  fs.writeFileSync(pidFile, String(process.pid));
  killPort(listenPort);
  killPort(targetPort);
  const next = spawn('npm', ['run', 'dev', '--', '--hostname', targetHost, '--port', String(targetPort)], {
    cwd: repo,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
  });
  const cleanup = () => {
    try { next.kill('SIGTERM'); } catch {}
    try { fs.unlinkSync(pidFile); } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  next.on('exit', (code) => process.exit(code || 0));
  const ready = await waitFor(`http://${targetHost}:${targetPort}/`);
  if (!ready) {
    console.error('Next dev server did not become ready');
    cleanup();
  }
  startProxy();
})();
