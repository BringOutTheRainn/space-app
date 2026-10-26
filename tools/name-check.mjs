import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Screen reader names: every visible control on every tab and window has a name, and no two
// controls in the same view share one (TalkBack users could not tell "Enter" from "Enter").
// Serve www/ on port 8766 first (npx http-server www -p 8766), then: node tools/name-check.mjs
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
// Repeats that are fine: every empty Garden plot does the same thing, and locked secret trophies
// are meant to look alike. A window's ✕ does the same as its own "Close" button.
const SAME_OK = ['plot empty', 'trophy secret', 'modal-x'];
const b = await pw.chromium.launch();
const problems = [];
for (const locale of ['en-US', 'de-DE']) {
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, locale });
  p.on('pageerror', (e) => problems.push(`${locale}: page error ${e.message}`));
  await p.goto('http://127.0.0.1:8766/index.html'); await p.waitForTimeout(1000);
  await p.evaluate(() => { const { ctx } = window.__game; const s = ctx.s; s.tutorialDone = true;
    s.stardust = 3e14; s.earnedRun = 4e14; s.earnedAll = 9e15; s.darkMatter = 140; s.collapses = 2; s.tapsAll = 1500; s.crystals = 3;
    s.generators = [100, 80, 60, 40, 30, 20, 10, 5, 3, 2, 1, 0, 0, 0]; s.genLevels = s.generators.map((n) => (n ? 2 : 0)); ctx.recalc(); ctx.save(); });
  await p.reload(); await p.waitForTimeout(1500);
  const close = async () => { for (let i = 0; i < 5 && await p.locator('.modal-x').count(); i++) { await p.locator('.modal-x').last().click(); await p.waitForTimeout(350); } };
  await close();
  const scan = (where) => p.evaluate(([where, sameOk]) => {
    const out = [];
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden],[aria-hidden="true"],[inert]'); };
    const name = (e) => {
      if (e.getAttribute('aria-label')) return e.getAttribute('aria-label').trim();
      const lb = e.getAttribute('aria-labelledby');
      if (lb) return lb.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
      if (e.id && document.querySelector(`label[for="${e.id}"]`)) return document.querySelector(`label[for="${e.id}"]`).textContent.trim();
      if (e.closest('label')) return e.closest('label').textContent.trim();
      const c = e.cloneNode(true); c.querySelectorAll('[aria-hidden="true"]').forEach((x) => x.remove());
      return (c.textContent.trim() || e.getAttribute('title') || '').trim();
    };
    const modals = [...document.querySelectorAll('.modal')].filter(vis);
    const scope = modals.length ? modals[modals.length - 1] : document;
    const seen = {};
    for (const e of scope.querySelectorAll('button,a[href],input,select,textarea,[role=button],[role=tab],[role=switch]')) {
      if (!vis(e) || (scope === document && e.closest('.modal'))) continue;
      const n = name(e);
      if (!n) { out.push(`${where}: no name: ${e.outerHTML.slice(0, 90)}`); continue; }
      if (sameOk.some((c) => e.matches('.' + c.split(' ').join('.')))) continue;
      (seen[n] ??= []).push(e);
    }
    for (const [n, els] of Object.entries(seen)) if (els.length > 1) out.push(`${where}: ${els.length} controls named "${n}"`);
    return out;
  }, [where, SAME_OK]);
  const views = [];
  for (const tab of ['build', 'upgrades', 'trophies', 'cosmos', 'probes']) views.push([`tab ${tab}`, `[data-tab="${tab}"]`]);
  for (const sel of ['#btn-stats', '#btn-settings', '#btn-shop', '.mini >> nth=0', '.mini >> nth=1', '.mini >> nth=2', '.mission-btn', '.gift-btn', '.hyper-btn']) views.push([sel, sel]);
  for (const [where, sel] of views) {
    await p.locator(sel).first().click({ timeout: 2000 }).catch(() => {});
    await p.waitForTimeout(450);
    problems.push(...(await scan(`${locale} ${where}`)));
    await close();
  }
  await p.close();
}
await b.close();
console.log(problems.length ? problems.join('\n') : 'every control named, no look-alikes');
process.exitCode = problems.length ? 1 : 0;
