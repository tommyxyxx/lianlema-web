#!/usr/bin/env node
const http = require('node:http');
const base = process.env.LIANLEMA_LAN_URL || 'http://10.0.0.40:3022';
function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
  });
}
(async () => {
  const page = await get(`${base}/train`);
  if (page.status !== 200) throw new Error(`/train status ${page.status}`);
  const css = page.body.match(/href="([^"?]*\/_next\/static\/css\/[^"?]+\.css[^" ]*)"/i)?.[1]
    || page.body.match(/(\/_next\/static\/css\/[^" ]+\.css[^" ]*)/)?.[1];
  if (!css) throw new Error('CSS href not found');
  const cssUrl = css.startsWith('http') ? css : `${base}${css.replace(/\\$/, '')}`;
  const cssRes = await get(cssUrl);
  const type = String(cssRes.headers['content-type'] || '');
  if (cssRes.status !== 200 || !type.includes('text/css') || cssRes.body.length < 1000) {
    throw new Error(`CSS unhealthy status=${cssRes.status} type=${type} length=${cssRes.body.length}`);
  }
  for (const marker of ['待保存动作', '今日已保存动作', '解析训练']) {
    if (!page.body.includes(marker)) throw new Error(`marker missing: ${marker}`);
  }
  console.log(JSON.stringify({ ok: true, base, css: cssUrl, cssLength: cssRes.body.length }, null, 2));
})().catch((error) => { console.error(error.message); process.exit(1); });
