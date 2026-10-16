// Lucky Orbit: a daily prize wheel, the most common daily hook in mobile idle
// games. One free spin a day, plus two more for a rewarded ad each. Prizes
// are minutes of production, a Hyperdrive top-up, a comet, or a crystal.

import { AD_CONFIG } from '../data/ads.js';
import { crystalsUnlocked } from './crystals.js';
import { dayNumber } from './daily.js';
import { earn, type Derived } from './economy.js';
import type { GameState } from './state.js';

export const AD_SPINS_PER_DAY = 2;
/** Every 7th day in a row, the free spin is a Golden Orbit. */
export const STREAK_DAYS = 7;
/** On a golden spin the jackpot is six times as likely and every prize is doubled. */
export const GOLDEN_JACKPOT_WEIGHT = 12;
export const GOLDEN_MULT = 2;
const JACKPOT = 7;

export type SliceKind = 'stardust' | 'hyper' | 'comet' | 'crystal';

export interface Slice {
  kind: SliceKind;
  /** Minutes of production, or of Hyperdrive. */
  minutes: number;
  weight: number;
  label: string;
}

/** Clockwise from the top. */
export const SLICES: Slice[] = [
  { kind: 'stardust', minutes: 15, weight: 24, label: '15 min' },
  { kind: 'hyper', minutes: 30, weight: 14, label: 'x2 30m' },
  { kind: 'stardust', minutes: 45, weight: 18, label: '45 min' },
  { kind: 'comet', minutes: 0, weight: 14, label: 'Comet' },
  { kind: 'stardust', minutes: 120, weight: 10, label: '2 hours' },
  { kind: 'crystal', minutes: 120, weight: 6, label: 'Crystal' },
  { kind: 'stardust', minutes: 60, weight: 12, label: '1 hour' },
  { kind: 'stardust', minutes: 480, weight: 2, label: 'Jackpot' },
];

function sync(s: GameState, now: number): void {
  const day = dayNumber(now);
  if (s.wheelDay !== day) {
    s.wheelDay = day;
    s.wheelFree = true;
    s.wheelAds = 0;
  }
}

export function freeSpinReady(s: GameState, now = Date.now()): boolean {
  sync(s, now);
  return s.wheelFree;
}

export function adSpinsLeft(s: GameState, now = Date.now()): number {
  sync(s, now);
  return s.wheelFree ? 0 : Math.max(0, AD_SPINS_PER_DAY - s.wheelAds);
}

/** The streak the next free spin would make: one more if yesterday's free spin was used. */
export function nextStreak(s: GameState, now = Date.now()): number {
  const day = dayNumber(now);
  if (s.wheelStreakDay === day) return s.wheelStreak;
  return s.wheelStreakDay === day - 1 ? s.wheelStreak + 1 : 1;
}

/** Days in a row so far, counting today only once its free spin is used (0 when broken). */
export function currentStreak(s: GameState, now = Date.now()): number {
  const day = dayNumber(now);
  return s.wheelStreakDay === day || s.wheelStreakDay === day - 1 ? s.wheelStreak : 0;
}

/** True when today's free spin, still unused, is a Golden Orbit. */
export function goldenReady(s: GameState, now = Date.now()): boolean {
  return freeSpinReady(s, now) && nextStreak(s, now) % STREAK_DAYS === 0;
}

function weightOf(i: number, golden: boolean): number {
  return golden && i === JACKPOT ? GOLDEN_JACKPOT_WEIGHT : SLICES[i].weight;
}

export function pickSlice(rng: () => number = Math.random, golden = false): number {
  const total = SLICES.reduce((n, _, i) => n + weightOf(i, golden), 0);
  let r = rng() * total;
  for (let i = 0; i < SLICES.length; i++) {
    r -= weightOf(i, golden);
    if (r < 0) return i;
  }
  return 0;
}

export function sliceValue(d: Derived, x: Slice): number {
  return Math.max(d.baseSps * x.minutes * 60, 100 * x.minutes);
}

export interface SpinResult {
  slice: number;
  /** Stardust paid, if any. */
  amount: number;
  /** A Golden Orbit spin (7th day in a row): doubled prizes. */
  golden: boolean;
  /** Days in a row after this spin. */
  streak: number;
}

/** Spins the wheel: the free spin first, then ad spins. Null when none are left. */
export function spin(s: GameState, d: Derived, viaAd: boolean, now = Date.now(), rng: () => number = Math.random): SpinResult | null {
  sync(s, now);
  if (viaAd ? adSpinsLeft(s, now) <= 0 : !s.wheelFree) return null;
  let golden = false;
  if (viaAd) {
    s.wheelAds++;
    s.adsWatched++;
  } else {
    s.wheelFree = false;
    s.wheelStreak = nextStreak(s, now);
    s.wheelStreakDay = dayNumber(now);
    golden = s.wheelStreak % STREAK_DAYS === 0;
  }
  s.wheelSpins++;
  const mult = golden ? GOLDEN_MULT : 1;
  const i = pickSlice(rng, golden);
  const x = SLICES[i];
  let amount = 0;
  switch (x.kind) {
    case 'hyper': {
      const start = Math.max(now, s.hyperEndsAt);
      s.hyperEndsAt = Math.min(now + AD_CONFIG.hyperCapMinutes * 60000, start + x.minutes * mult * 60000);
      break;
    }
    case 'comet':
      s.nextCometAt = s.time;
      // A golden comet also brings the smallest prize's worth of Stardust.
      if (golden) {
        amount = sliceValue(d, SLICES[0]) * mult;
        earn(s, amount);
      }
      break;
    case 'crystal':
      if (crystalsUnlocked(s)) {
        s.crystals += mult;
        break;
      }
      // Before crystals open, the slice pays its minutes instead.
      amount = sliceValue(d, x) * mult;
      earn(s, amount);
      break;
    case 'stardust':
      amount = sliceValue(d, x) * mult;
      earn(s, amount);
      break;
  }
  return { slice: i, amount, golden, streak: currentStreak(s, now) };
}
