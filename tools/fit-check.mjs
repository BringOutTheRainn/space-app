import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Text fit check: every tab and window, late game, in all five languages on 320 and 360 px phones and a phone held sideways (640x360).
// Reports text cut off by its box and English left in a translated screen; exits 1 if any.
// Text shortened with an ellipsis on purpose is listed only with --ellipsis.
// Serve www/ on port 8766 first (npx http-server www -p 8766), then: node tools/fit-check.mjs [--ellipsis]
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const SHOW_ELLIPSIS = process.argv.includes('--ellipsis');
const LANGS = ['en', 'es', 'pt', 'fr', 'de'];
const WIDTHS = [[320, 568], [360, 640], [640, 360]];
const WINDOWS = ['openStats', 'openSettings', 'openHyperdrive', 'openCrystals', 'openGarden', 'openEvent', 'openForge',
  'openMarket', 'openPass', 'openMissions', 'openDaily', 'openShop', 'showRatingPrompt'];
// Common English words; finding one on a translated screen means a string was missed.
const ENG = /\b(the|and|your|you|with|every|while|from|this|tap|left|ready|level|watch)\b/i;
let problems = 0;
const b = await pw.chromium.launch();
for (const lang of LANGS) for (const [width, height] of WIDTHS) {
  const p = await b.newPage({ viewport: { width, height } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const close = async () => { for (let i = 0; i < 5 && await p.locator('.modal-x').count(); i++) { await p.locator('.modal-x').last().click(); await p.waitForTimeout(250); } };
  await p.goto('http://127.0.0.1:8766/index.html'); await p.waitForTimeout(800);
  await p.evaluate((l) => { const { ctx } = window.__game; const s = ctx.s; s.tutorialDone = true; s.settings.lang = l;
    s.stardust = 3e14; s.earnedRun = 4e14; s.earnedAll = 9e15; s.darkMatter = 140; s.collapses = 2; s.tapsAll = 1500; s.crystals = 3;
    s.generators = [100, 80, 60, 40, 30, 20, 10, 5, 3, 2, 1, 0, 0, 0]; s.genLevels = s.generators.map((n) => (n ? 2 : 0));
    ctx.recalc(); ctx.save(); }, lang);
  await p.reload(); await p.waitForTimeout(1500); await close();
  await p.addStyleTag({ content: '.toasts{display:none!important}' });
  const report = async (where) => {
    const found = await p.evaluate(({ src, english, showEllipsis }) => {
      const out = [];
      for (const e of document.querySelectorAll('body *')) {
        if (!e.offsetParent || e.children.length > 1 || e.closest('.news,.ticker,#news,.sr-only')) continue;
        if (getComputedStyle(e).overflow === 'visible') continue;
        if (e.scrollWidth <= e.clientWidth + 2) continue;
        // A trailing "..." is a deliberate one-line layout; text cut with no ellipsis is a bug.
        if (getComputedStyle(e).textOverflow === 'ellipsis') { if (showEllipsis) out.push('shortened: ' + e.textContent.trim().slice(0, 70)); }
        else out.push('cut off: ' + e.textContent.trim().slice(0, 70));
      }
      if (!english) {
        const re = new RegExp(src, 'i'); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) { const el = w.currentNode.parentElement; const x = w.currentNode.textContent.trim();
          if (!el || !x || el.closest('[hidden],.toasts,script,style,.sr-only') || getComputedStyle(el).display === 'none') continue;
          if (re.test(x)) out.push('English: ' + x.slice(0, 70)); }
      }
      return [...new Set(out)];
    }, { src: ENG.source, english: lang === 'en', showEllipsis: SHOW_ELLIPSIS });
    for (const f of found) { if (!f.startsWith('shortened')) problems++; console.log(`${lang} ${width}px ${where}: ${f}`); }
  };
  for (const tab of await p.$$eval('[data-tab]:not([hidden])', (els) => els.map((e) => e.dataset.tab))) {
    await p.click(`[data-tab="${tab}"]`); await p.waitForTimeout(300); await report('tab ' + tab);
  }
  for (const fn of WINDOWS) {
    await p.evaluate(async (fn) => { const m = fn === 'openShop' ? await import('./js/ui/store.js') : fn === 'showRatingPrompt' ? await import('./js/ui/rating.js') : await import('./js/ui/menus.js'); m[fn](window.__game.ctx, () => {}); }, fn);
    await p.waitForTimeout(400); await report(fn); await close();
  }
  await p.evaluate(async () => (await import('./js/ui/menus.js')).showOffline(window.__game.ctx, 7200, 1e12));
  await p.waitForTimeout(400); await report('welcome back'); await close();
  for (const e of errs) { problems++; console.log(`${lang} ${width}px page error: ${e}`); }
  await p.close();
}
await b.close();
console.log(problems ? `${problems} problem(s)` : 'All text fits, and no English on translated screens.');
process.exitCode = problems ? 1 : 0;
