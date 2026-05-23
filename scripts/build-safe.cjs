#!/usr/bin/env node
const { spawnSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');

function readPid(path) {
  try { return Number(fs.readFileSync(path, 'utf8').trim()); } catch { return null; }
}
function killPid(pid) {
  if (!pid) return;
  try { process.kill(pid, 'SIGTERM'); } catch {}
}
function killPort(port) {
  try {
    const out = execFileSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
    for (const pid of out.split(/\s+/).filter(Boolean)) killPid(Number(pid));
  } catch {}
}

const nextPid = readPid('/tmp/lianlema-canonical-next.pid');
const proxyPid = readPid('/tmp/lianlema-proxy-3022.pid');
killPid(nextPid);
killPid(proxyPid);
killPort(3000);
killPort(3022);
const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
if (result.status !== 0) process.exit(result.status || 1);
console.log('\nBuild completed. Restart LAN service with: npm run dev:lan');
