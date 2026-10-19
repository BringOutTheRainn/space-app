// Save fuzz test: damages a late-game save at random (1 to 3 fields set to junk)
// and checks that loading it, offline progress, a few ticks and a reload never
// throw or leave a balance negative, NaN or Infinity.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../www/js/core/state.js';
import { serialize, deserialize, applyOffline, repairNumbers } from '../www/js/core/save.js';
import { computeDerived, tick } from '../www/js/core/economy.js';

test('damaged saves load and play without broken numbers', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const now = Date.UTC(2026, 9, 19, 12);
  const s0 = newState(now - 86400000);
  Object.assign(s0, { stardust: 3e17, earnedRun: 4e17, earnedAll: 9e18, darkMatter: 400, collapses: 4, crystals: 40, playSeconds: 90000, lastSeen: now - 7200000 });
  s0.generators = [180, 160, 140, 120, 100, 90, 70, 50, 35, 20, 8, 2, 0, 0];
  const base = serialize(s0);
  const JUNK = [null, 'x', -5, 1e308, [], {}, true, 0, '', [1, 'a'], { a: null }];
  const paths = (o, pre = []) => Object.entries(o).flatMap(([k, v]) => [[...pre, k], ...(v && typeof v === 'object' ? paths(v, [...pre, k]) : [])]);
  const allPaths = paths(JSON.parse(base));
  const fails = [];
  for (let i = 0; i < 2000 && fails.length < 5; i++) {
    const o = JSON.parse(base);
    const hits = [];
    for (let j = 0, n = 1 + Math.floor(rnd() * 3); j < n; j++) {
      const p = allPaths[Math.floor(rnd() * allPaths.length)];
      let t = o;
      for (const k of p.slice(0, -1)) { if (!t || typeof t !== 'object') break; t = t[k]; }
      if (!t || typeof t !== 'object') continue;
      const junk = JUNK[Math.floor(rnd() * JUNK.length)];
      t[p[p.length - 1]] = junk;
      hits.push(p.join('.') + '=' + JSON.stringify(junk));
    }
    let s;
    try { s = deserialize(JSON.stringify(o), now); } catch (e) {
      // Damage to the save's marker is meant to be refused, not loaded.
      if (!/Not a Stardust Empire save/.test(e.message)) fails.push(`${hits.join(' ')}: ${e.message}`);
      continue;
    }
    try {
      let d = computeDerived(s, now);
      applyOffline(s, d, now);
      d = computeDerived(s, now);
      for (let k = 0; k < 5; k++) tick(s, d, 0.2);
      repairNumbers(s, now);
      const again = deserialize(serialize(s), now);
      const bad = ['stardust', 'earnedRun', 'earnedAll', 'darkMatter', 'crystals'].filter((k) => !Number.isFinite(again[k]) || again[k] < 0);
      const dd = computeDerived(again, now);
      if (!Number.isFinite(dd.sps) || !Number.isFinite(dd.tap)) bad.push('sps/tap');
      if (bad.length) fails.push(`${hits.join(' ')}: ${bad.join(',')}`);
    } catch (e) { fails.push(`${hits.join(' ')}: ${e.message}`); }
  }
  assert.deepEqual(fails, []);
});
