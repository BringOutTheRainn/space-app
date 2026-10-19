// Collapsing the universe: reset the run for permanent Dark Matter.

import { COSMIC } from '../data/cosmic.js';
import { GENERATORS } from '../data/generators.js';
import { UPGRADE_BY_ID } from '../data/upgrades.js';
import type { Derived } from './economy.js';
import { sellAllGoods } from './market.js';
import type { GameState } from './state.js';

export const DM_SCALE = 1e10;

/** Total Dark Matter a lifetime of earnings is worth. */
export function darkMatterForEarnings(earnedAll: number): number {
  return Math.floor(Math.cbrt(earnedAll / DM_SCALE));
}

export function pendingDarkMatter(s: GameState): number {
  return Math.max(0, darkMatterForEarnings(s.earnedAll) - s.darkMatter);
}

/** Lifetime Stardust needed for the next whole Dark Matter. */
export function earningsForNextDarkMatter(s: GameState): number {
  const next = darkMatterForEarnings(s.earnedAll) + 1;
  return Math.pow(next, 3) * DM_SCALE;
}

export function canCollapse(s: GameState): boolean {
  return pendingDarkMatter(s) >= 1;
}

export function starterGenerators(s: GameState): number[] {
  const out = GENERATORS.map(() => 0);
  for (const c of COSMIC) {
    if (!s.cosmic[c.id]) continue;
    for (const e of c.effects) if (e.k === 'starter') out[e.gen] = Math.max(out[e.gen], e.count);
  }
  return out;
}

/** Collapse the universe. Returns the Dark Matter gained. */
/** Dark Matter per hour for a universe that gave `dm` over `secs` seconds; 0 when no time passed. */
export function darkMatterPerHour(dm: number, secs: number): number {
  return secs > 0 ? (dm * 3600) / secs : 0;
}

/** How many finished universes Stats lists. */
export const PAST_RUNS_KEPT = 10;

export function collapse(s: GameState, d: Derived, now = Date.now()): number {
  if (pendingDarkMatter(s) < 1) return 0;
  // Goods are priced from production, so sell them while it is high. Profit counts toward Dark Matter.
  sellAllGoods(s, d, now);
  const gained = pendingDarkMatter(s);
  s.darkMatter += gained;
  s.collapses++;
  s.pastRuns = [{ dm: gained, secs: Math.max(0, s.time - s.runStartClock) }, ...s.pastRuns].slice(0, PAST_RUNS_KEPT);
  resetRun(s, d, now);
  s.anomaly = null;
  return gained;
}

/** Starts a fresh universe: keeps permanent progress, clears the rest. */
export function resetRun(s: GameState, d: Derived, now = Date.now()): void {
  s.stardust = 0;
  s.earnedRun = 0;
  s.tapEarnedRun = 0;
  s.tapsRun = 0;
  s.cometsRun = 0;
  s.buffs = [];
  s.missions = [];
  s.generators = starterGenerators(s);
  const kept: Record<string, true> = {};
  if (d.keepResearch) {
    for (const id in s.upgrades) if (UPGRADE_BY_ID[id]?.group === 'research') kept[id] = true;
  }
  s.upgrades = kept;
  s.runStartedAt = now;
  s.runStartClock = s.time;
  s.nextCometAt = s.time + 90;
}

/** Production bonus per Dark Matter held: 2%, plus the Resonance Cosmic upgrades. */
export function darkMatterPct(s: GameState): number {
  let pct = 0.02;
  for (const c of COSMIC) {
    if (!s.cosmic[c.id]) continue;
    for (const e of c.effects) if (e.k === 'dmBonus') pct += e.pct;
  }
  return pct;
}

/** How much a collapse now would multiply the Dark Matter production bonus (1 = no change). */
export function collapseGain(s: GameState): number {
  const pct = darkMatterPct(s);
  return (1 + pct * (s.darkMatter + pendingDarkMatter(s))) / (1 + pct * s.darkMatter);
}
