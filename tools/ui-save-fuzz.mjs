// Loads damaged late-game saves into the real game (served at http://127.0.0.1:8766,
// for example with `npx http-server www -p 8766`) and clicks through every tab and window.
// Usage: node tools/ui-save-fuzz.mjs [count] [seed]
import { createRequire } from 'node:module';
import { newState } from '../www/js/core/state.js';
import { serialize } from '../www/js/core/save.js';
const require = createRequire(import.meta.url);
const pw = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const N = Number(process.argv[2] ?? 60);
let seed = Number(process.argv[3] ?? 11); const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const now = Date.now();
const s0 = newState(now - 86400000);
Object.assign(s0, { stardust: 3e17, earnedRun: 4e17, earnedAll: 9e18, darkMatter: 400, collapses: 4, crystals: 40, playSeconds: 90000, lastSeen: now - 7200000 });
s0.generators = [180, 160, 140, 120, 100, 90, 70, 50, 35, 20, 8, 2, 0, 0];
const base = serialize(s0);
const JUNK = [null, 'x', -5, 1e308, [], {}, true, 0, '', [1, 'a'], { a: null }];
const paths = (o, pre = []) => Object.entries(o).flatMap(([k, v]) => [[...pre, k], ...(v && typeof v === 'object' ? paths(v, [...pre, k]) : [])]);
const allPaths = paths(JSON.parse(base));
const b = await pw.chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
let broken = 0;
for (let i = 0; i < N; i++) {
  const o = JSON.parse(base); const hits = [];
  for (let j = 0, n = 1 + Math.floor(rnd() * 3); j < n; j++) {
    const p = allPaths[Math.floor(rnd() * allPaths.length)];
    let t = o; for (const k of p.slice(0, -1)) { if (!t || typeof t !== 'object') break; t = t[k]; }
    if (!t || typeof t !== 'object') continue;
    const junk = JUNK[Math.floor(rnd() * JUNK.length)]; t[p[p.length - 1]] = junk; hits.push(p.join('.') + '=' + JSON.stringify(junk));
  }
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).split('\n')[0].slice(0, 140)));
  await page.goto('http://127.0.0.1:8766/index.html');
  await page.evaluate((txt) => { localStorage.clear(); localStorage.setItem('stardust-empire-save', txt); localStorage.setItem('stardust-empire-save-backup', txt); }, JSON.stringify(o));
  await page.reload(); await page.waitForTimeout(900);
  const close = async () => { for (let k = 0; k < 4 && await page.locator('.modal-x').count(); k++) { await page.locator('.modal-x').last().click({ timeout: 1000 }).catch(() => {}); await page.waitForTimeout(120); } };
  await close();
  for (const tab of ['upgrades', 'trophies', 'cosmos', 'probes', 'build']) { await page.click(`[data-tab="${tab}"]`, { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(150); }
  for (const btn of ['#btn-stats', '#btn-settings', '#btn-shop']) { await page.click(btn, { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(200); await close(); }
  const ok = await page.evaluate(() => !!window.__game && Number.isFinite(window.__game.ctx.s.stardust)).catch(() => false);
  if (errs.length || !ok) { broken++; console.log(ok ? 'ERR' : 'BROKEN', hits.join('  '), '\n   ', [...new Set(errs)].join(' | ')); }
  await page.close();
}
console.log(`${N} damaged saves in the browser, ${broken} with errors`);
await b.close();
process.exitCode = broken ? 1 : 0;
