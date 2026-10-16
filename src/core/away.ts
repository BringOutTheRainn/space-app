// What each system did while the player was away, for the welcome-back window.

import type { GameState } from './state.js';
import { growCrystals } from './crystals.js';
import { currentEvent } from './event.js';
import { forgeUnlocked, maxHeat, syncHeat } from './forge.js';
import { readyPlots } from './garden.js';
import { syncMarket } from './market.js';
import { fillVault } from './shop.js';

export interface AwayReport {
  /** Quasar Crystals banked while away. */
  crystals: number;
  /** Probes back from expeditions, waiting to be collected. */
  probes: number;
  /** Garden plots ready to harvest. */
  plants: number;
  /** The Star Forge is at full heat. */
  forgeFull: boolean;
  /** Event Flux earned while away. */
  flux: number;
  /** Hours saved in the Stardust Vault, when it grew while away. */
  vaultHours: number;
  /** Credit profit (or loss, below 0) on goods held at the Warp Exchange; null when none are held. */
  marketPL: number | null;
}

/**
 * Brings every real-time system up to date and reports what is waiting.
 * Call it once, right after offline Stardust is applied.
 */
export function awayReport(s: GameState, now = Date.now()): AwayReport {
  const crystals = growCrystals(s, now);
  const fluxBefore = s.event?.earned ?? 0;
  const weekBefore = s.event?.week;
  const ev = currentEvent(s, now);
  const flux = ev ? ev.earned - (ev.week === weekBefore ? fluxBefore : 0) : 0;
  const vaultBefore = s.vaultHours;
  fillVault(s, now);
  const m = syncMarket(s, now);
  const held = m ? m.goods.filter((g) => g.held > 0) : [];
  return {
    crystals,
    probes: s.expeditions.filter((e) => e.returnsAt <= now).length,
    plants: readyPlots(s, now),
    forgeFull: forgeUnlocked(s) && syncHeat(s, now) >= maxHeat(s),
    flux: Math.max(0, flux),
    vaultHours: s.vaultHours > vaultBefore ? s.vaultHours : 0,
    marketPL: held.length ? held.reduce((sum, g) => sum + (g.price - g.avg) * g.held, 0) : null,
  };
}
