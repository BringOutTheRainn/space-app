// Comets: random visitors that give short, strong boosts when tapped.

import { earn, type Derived } from './economy.js';
import type { BuffKind, GameState } from './state.js';

export const COMET_STAY_SECONDS = 13;
const MIN_DELAY = 120;
const MAX_DELAY = 360;

export type Rng = () => number;

export interface CometResult {
  kind: 'rush' | 'haul' | 'supernova' | 'horizon' | 'bighaul' | 'well';
  amount: number;
  /** How long the buff lasts, 0 for a payout. */
  secs: number;
  black: boolean;
}

export function scheduleNextComet(s: GameState, d: Derived, rng: Rng = Math.random): void {
  const delay = (MIN_DELAY + rng() * (MAX_DELAY - MIN_DELAY)) / d.cometFreq;
  s.nextCometAt = s.time + delay;
}

export function cometStaySeconds(d: Derived): number {
  return COMET_STAY_SECONDS * d.cometStay;
}

/** Is it time for a comet? The UI spawns one and then calls scheduleNextComet. */
export function cometDue(s: GameState): boolean {
  return s.time >= s.nextCometAt;
}

export function rollBlack(d: Derived, rng: Rng = Math.random): boolean {
  return d.blackComets && rng() < 0.12;
}

export function addBuff(s: GameState, kind: BuffKind, seconds: number): void {
  const endsAt = s.time + seconds;
  const existing = s.buffs.find((b) => b.kind === kind);
  if (existing) {
    existing.endsAt = Math.max(existing.endsAt, endsAt);
    existing.duration = existing.endsAt - s.time;
  } else {
    s.buffs.push({ kind, endsAt, duration: seconds });
  }
}

export function catchComet(s: GameState, d: Derived, black: boolean, rng: Rng = Math.random): CometResult {
  s.cometsRun++;
  s.cometsAll++;
  const roll = rng();
  const dur = d.cometEffect;
  if (!black) {
    if (roll < 0.45) {
      const secs = Math.round(77 * dur);
      addBuff(s, 'rush', secs);
      return { kind: 'rush', amount: 0, secs, black };
    }
    if (roll < 0.9) {
      const amount = Math.min(s.stardust * 0.15, d.baseSps * 900) + 13;
      earn(s, amount);
      return { kind: 'haul', amount, secs: 0, black };
    }
    const secs = Math.round(13 * dur);
    addBuff(s, 'supernova', secs);
    return { kind: 'supernova', amount: 0, secs, black };
  }
  if (roll < 0.45) {
    const secs = Math.round(13 * dur);
    addBuff(s, 'horizon', secs);
    return { kind: 'horizon', amount: 0, secs, black };
  }
  if (roll < 0.75) {
    const amount = Math.min(s.stardust * 0.3, d.baseSps * 3600) + 13;
    earn(s, amount);
    return { kind: 'bighaul', amount, secs: 0, black };
  }
  addBuff(s, 'well', 66);
  return { kind: 'well', amount: 0, secs: 66, black };
}
