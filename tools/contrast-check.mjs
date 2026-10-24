import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Text contrast check (WCAG AA: 4.5:1, or 3:1 for large text) over every tab and window.
// Serve www/ on port 8766 first (npx http-server www -p 8766), then: node tools/contrast-check.mjs
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const b = await pw.chromium.launch();
const c = await b.newContext({ viewport: { width: 360, height: 640 } });
const p = await c.newPage();
await p.goto('http://127.0.0.1:8766/index.html'); await p.waitForTimeout(800);
await p.evaluate(() => { const { ctx } = window.__game; const s = ctx.s; s.tutorialDone = true; s.stardust = 3e14; s.earnedRun = 4e14; s.earnedAll = 9e15; s.collapses = 1;
  s.generators = [100, 80, 60, 40, 30, 20, 10, 5, 3, 2, 1, 0, 0, 0]; ctx.recalc(); ctx.save(); location.reload(); });
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelectorAll('.modal .btn').forEach((x) => { if (/close|ok/i.test(x.textContent)) x.click(); }));
// Toasts fade in and out over whatever is underneath, so they are checked in their settled state
// on the sky only (white on a dark panel); hide them so a half-faded one doesn't count.
await p.addStyleTag({ content: '.toasts{display:none!important}' });
const scan = (label) => p.evaluate((label) => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; };
  const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { const layers = []; const r0 = el.getBoundingClientRect(); const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2; for (let e = el; e; e = e.parentElement) { const st = getComputedStyle(e); if (e !== el) { const r = e.getBoundingClientRect(); if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue; } if (st.backgroundImage.includes('gradient') && !layers.length) { const ms = [...st.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c[3] > 0.9); if (ms.length) { const avg = [0,1,2].map((i) => ms.reduce((n, c) => n + c[i], 0) / ms.length); layers.push([...avg, 1]); break; } } const c = parse(st.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let col = [11, 13, 28]; for (const l of layers.reverse()) col = col.map((v, i) => v * (1 - l[3]) + l[i] * l[3]); return col; };
  const out = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const b = el.getBoundingClientRect(); if (!b.width || b.bottom < 0 || b.top > innerHeight) continue;
    const st = getComputedStyle(el); if (st.visibility === 'hidden' || +st.opacity === 0) continue;
    const fg = parse(st.color); const bg = bgOf(el); if (!fg || !bg) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const a = fg[3] * op; const mix = fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
    const L1 = lum(mix), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(st.fontSize) >= 24 || (parseFloat(st.fontSize) >= 18.66 && +st.fontWeight >= 700);
    const need = big ? 3 : 4.5;
    const dis = el.closest('button:disabled');
    if (ratio < need && !dis) { const k = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${st.color} ${ratio.toFixed(2)}`; if (!out.has(k)) out.set(k, el.textContent.trim().slice(0, 30)); }
  }
  return [label, [...out].map(([k, v]) => `${k} "${v}"`)];
}, label);
const pr = (r) => { if (r[1].length) { console.log('==', r[0]); r[1].forEach((x) => console.log('  ', x)); } };
const close = async () => { for (let i=0;i<5 && await p.locator('.modal-x').count();i++){await p.locator('.modal-x').last().click();await p.waitForTimeout(300);} };
await close();
await p.evaluate(() => { const { ctx } = window.__game; const s = ctx.s; s.darkMatter = 140; s.collapses = 2; s.cosmic = { glow: true, seed: true, magnet: true, fingers: true, kit: true, cache: true, bay: true }; s.relics = { shard: 3, core: 1 }; s.crystals = 3; s.genLevels = s.generators.map((n) => n ? 2 : 0); ctx.recalc(); ctx.save(); });
const tabs = await p.$$eval('[data-tab]', (els) => els.map((e) => e.dataset.tab));
for (const tab of tabs) { await p.click(`[data-tab="${tab}"]`); await p.waitForTimeout(400); pr(await scan('tab ' + tab)); await p.evaluate(() => { const b = document.querySelector('.tab-body:not([hidden])'); if (b) b.scrollTop = 99999; }); await p.waitForTimeout(200); pr(await scan('tab ' + tab + ' bottom')); }
for (const fn of ['openStats','openSettings','openHyperdrive','openCrystals','openGarden','openEvent','openForge','openMarket','openPass','openMissions','openDaily','openShop','showRatingPrompt']) {
  await p.evaluate(async (fn) => { const m = fn === 'openShop' ? await import('./js/ui/store.js') : fn === 'showRatingPrompt' ? await import('./js/ui/rating.js') : await import('./js/ui/menus.js'); m[fn](window.__game.ctx, () => {}); }, fn); await p.waitForTimeout(600);
  pr(await scan(fn));
  await p.evaluate(() => { document.querySelectorAll('.modal-body').forEach((b) => b.scrollTop = 99999); }); await p.waitForTimeout(200); pr(await scan(fn + ' bottom'));
  await close();
}
// Welcome back after a long absence, including the storage-full note.
await p.evaluate(async () => { const m = await import('./js/ui/menus.js'); m.showOffline(window.__game.ctx, 12 * 3600, 5e9); }); await p.waitForTimeout(600);
pr(await scan('showOffline'));
await close();
// Late game: the whole cosmic tree owned, so Stellar Echoes can be bought.
await p.evaluate(async () => { const { COSMIC } = await import('./js/data/cosmic.js'); const { ctx } = window.__game; for (const c of COSMIC) ctx.s.cosmic[c.id] = true; ctx.s.darkMatter = 5000; ctx.s.echoes = 1; ctx.recalc(); });
await p.click('[data-tab="cosmos"]'); await p.waitForTimeout(400);
await p.evaluate(() => { const b = document.querySelector('.tab-body:not([hidden])'); if (b) b.scrollTop = 99999; }); await p.waitForTimeout(200);
pr(await scan('stellar echoes'));
// Settings with both warnings showing: saves failing and a caught error.
await p.evaluate(async () => { const { ctx } = window.__game; ctx.saveFailing = true; const e = await import('./js/ui/errors.js'); e.recordError('frame', new Error('contrast check')); const m = await import('./js/ui/menus.js'); m.openSettings(ctx, () => {}); });
await p.waitForTimeout(600); await p.evaluate(() => { document.querySelectorAll('.modal-body').forEach((b) => b.scrollTop = 99999); }); await p.waitForTimeout(200);
pr(await scan('settings with warnings'));
await close();
// Last, since they replace the page: the crash screen and the could-not-start message.
await p.evaluate(() => { document.body.innerHTML = '<div class="crash" role="alert"><h2>Stardust Empire could not start</h2><p>Your progress is still saved on this phone.</p><textarea class="code" readonly>report</textarea><button class="btn btn-primary">Copy error report</button></div>'; });
pr(await scan('crash screen'));
await p.evaluate(() => { document.body.innerHTML = '<div id="app"><div class="boot old-webview" role="alert">Stardust Empire could not start. Please close the game and open it again.</div></div>'; });
pr(await scan('start failure'));
await b.close();
