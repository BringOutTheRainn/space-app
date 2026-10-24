// Soak test: windows left open (Stats redraws every second) and 300 toasts in a row, checking
// that DOM nodes and memory come back down. Serve www/ on port 8766 first (npx http-server www -p 8766),
// then: node tools/soak.mjs (LOC=de-DE by default).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const b = await pw.chromium.launch();
const c = await b.newContext({ viewport: { width: 360, height: 740 }, locale: process.env.LOC || 'de-DE' });
const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://127.0.0.1:8766/index.html'); await p.waitForTimeout(900);
await p.evaluate(() => { const { ctx } = window.__game; const s = ctx.s; s.tutorialDone = true; s.stardust = 4.7e18; s.earnedRun = 9e18; s.earnedAll = 9e19; s.collapses = 3; s.darkMatter = 52000;
  s.generators = s.generators.map(() => 40); ctx.recalc(); ctx.save(); location.reload(); });
await p.waitForTimeout(1500);
for (let i = 0; i < 4 && await p.locator('.modal-x').count(); i++) { await p.locator('.modal-x').last().click(); await p.waitForTimeout(200); }
const cdp = await c.newCDPSession(p);
const metrics = async () => { const { metrics } = await cdp.send('Performance.getMetrics'); const m = Object.fromEntries(metrics.map((x) => [x.name, x.value])); return { nodes: m.Nodes, listeners: m.JSEventListeners, heapMB: +(m.JSHeapUsedSize / 1e6).toFixed(1), scriptS: +m.ScriptDuration.toFixed(2) }; };
await cdp.send('Performance.enable');
await cdp.send('HeapProfiler.collectGarbage');
console.log('start', await metrics());
// Stats (redraws every second) and Missions windows open for a while
for (const re of [/stat/i, /mission/i]) {
  await p.evaluate((src) => [...document.querySelectorAll('button')].find((x) => new RegExp(src, 'i').test(x.getAttribute('aria-label') || ''))?.click(), re.source);
  await p.waitForTimeout(30000);
  console.log('after 30s', re.source, await metrics(), 'modal nodes', await p.evaluate(() => document.getElementById('modals').getElementsByTagName('*').length));
  await p.locator('.modal-x').last().click(); await p.waitForTimeout(400);
}
// 300 toasts with numbers
await p.evaluate(async () => { const m = await import('./js/ui/dom.js'); for (let i = 0; i < 300; i++) { m.toast(`<b>Test</b><br>+${(i + 1) * 1.5}B Stardust`, 'good', 200); await new Promise((r) => setTimeout(r, 20)); } });
await p.waitForTimeout(4000);
await cdp.send('HeapProfiler.collectGarbage');
console.log('after toasts', await metrics(), 'toast nodes', await p.evaluate(() => document.getElementById('toasts').getElementsByTagName('*').length));
console.log(errs.join(';') || 'no errors');
await b.close();
