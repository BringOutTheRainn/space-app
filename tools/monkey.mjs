// Random-tap release check: taps random visible controls in every language, from a fresh start and
// from a late-game save, then checks for page errors, sane numbers and a save that reloads.
// Serve www/ on port 8766 first (npx http-server www -p 8766), then: node tools/monkey.mjs [steps]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const STEPS = Number(process.argv[2] ?? 300);
const RUNS = [['en-US', false], ['es-419', true], ['pt-BR', false], ['fr-FR', true], ['de-DE', false], ['en-US', true]];
let failed = 0;
const b = await pw.chromium.launch();
for (const [i, [locale, late]] of RUNS.entries()) {
  let seed = i + 1;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, locale });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  // Warnings too: the WebView sends them to logcat, which Play's pre-launch report reads (run 197 found 18 audio ones per start).
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  p.on('dialog', (d) => d.dismiss());
  await p.goto('http://127.0.0.1:8766/index.html'); await p.waitForTimeout(800);
  if (late) await p.evaluate(() => { const { ctx } = window.__game; const s = ctx.s; s.tutorialDone = true; s.stardust = 3e17; s.earnedRun = 4e17; s.earnedAll = 9e18; s.darkMatter = 400; s.collapses = 4; s.crystals = 40;
    s.cosmic = { glow: true, seed: true, magnet: true, fingers: true, kit: true, probe: true, map: true, fabricators: true, cache: true, bay: true };
    s.generators = [180, 160, 140, 120, 100, 90, 70, 50, 35, 20, 8, 2, 0, 0]; s.genLevels = s.genLevels.map((v, j) => (j < 10 ? 2 : v)); ctx.recalc(); ctx.save(); location.reload(); });
  await p.waitForTimeout(1200);
  const seen = new Set();
  for (let n = 0; n < STEPS; n++) {
    // Everything tappable on screen, except anything that wipes or replaces the save.
    const targets = await p.evaluate(() => [...document.querySelectorAll('button, [data-tab], .gen, [role=button], input[type=checkbox], .plot, .seed, #sky')]
      .filter((el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && st.visibility !== 'hidden' && !el.disabled
        && !/reset|delete|wipe|import/i.test((el.id || '') + ' ' + (el.className || '') + ' ' + (el.textContent || '')); })
      .map((el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, (el.id || el.className || el.tagName).toString().split(' ')[0]]; }));
    if (!targets.length) break;
    const [x, y, k] = targets[Math.floor(rnd() * targets.length)];
    seen.add(k);
    await p.mouse.click(x, y).catch(() => {});
    if (rnd() < 0.05) await p.keyboard.press('Escape');
    await p.waitForTimeout(40);
  }
  const finite = await p.evaluate(() => { const { ctx } = window.__game; ctx.save(); const s = ctx.s; return ['stardust', 'earnedAll', 'darkMatter', 'crystals'].every((k) => Number.isFinite(s[k]) && s[k] >= 0); });
  await p.reload(); await p.waitForTimeout(1200);
  const reloads = await p.evaluate(() => Number.isFinite(window.__game?.ctx.s.stardust));
  const bad = errors.length || !finite || !reloads;
  if (bad) failed++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${locale} ${late ? 'late game' : 'new game '} ${STEPS} taps on ${seen.size} kinds of control${errors.length ? ': ' + [...new Set(errors)].slice(0, 5).join(' | ') : ''}${finite ? '' : ', bad numbers'}${reloads ? '' : ', save did not reload'}`);
  await p.close();
}
await b.close();
process.exitCode = failed ? 1 : 0;
