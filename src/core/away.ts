// What each system did while the player was away, for the welcome-back window.

import type { GameState } from './state.js';
import { growCrystals } from './crystals.js';
import { currentEvent } from './event.js';
import { forgeUnlocked, maxHeat, syncHeat } from './forge.js';
import { readyPlots } from './garden.js';
import { syncMarket } from './market.js';
import { fillVault } from './shop.js';
import { AD_CONFIG } from '../data/ads.js';

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
  /** Minutes of free Hyperdrive given as a comeback gift; 0 when none. */
  giftMinutes: number;
}

/** A player gone this long gets a comeback gift. */
export const COMEBACK_AWAY_MS = 3 * 86400000;
/** At most one gift per this long, so it cannot be farmed by toggling the clock. */
export const COMEBACK_EVERY_MS = 7 * 86400000;
/** Only players who really played get one (seconds of active play). */
export const COMEBACK_MIN_PLAY = 1800;
export const COMEBACK_HYPER_MINUTES = 120;

/**
 * Free Hyperdrive for a player coming back after days away, since storage
 * stopped filling long ago. Returns the minutes added (0 when not due).
 */
export function comebackGift(s: GameState, awaySeconds: number, now = Date.now()): number {
  if (awaySeconds * 1000 < COMEBACK_AWAY_MS || s.playSeconds < COMEBACK_MIN_PLAY) return 0;
  // A gift stamped in the future means the clock was moved back; do not lock gifts out for good.
  if (s.comebackAt > now) s.comebackAt = 0;
  if (s.comebackAt && now - s.comebackAt < COMEBACK_EVERY_MS) return 0;
  const start = Math.max(now, s.hyperEndsAt);
  const end = Math.min(now + AD_CONFIG.hyperCapMinutes * 60000, start + COMEBACK_HYPER_MINUTES * 60000);
  const minutes = Math.round((end - start) / 60000);
  if (minutes <= 0) return 0;
  s.hyperEndsAt = end;
  s.comebackAt = now;
  return minutes;
}

/**
 * Brings every real-time system up to date and reports what is waiting.
 * Call it once, right after offline Stardust is applied, with the seconds away.
 */
export function awayReport(s: GameState, now = Date.now(), awaySeconds = 0): AwayReport {
  const giftMinutes = comebackGift(s, awaySeconds, now);
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
    giftMinutes,
    marketPL: held.length ? held.reduce((sum, g) => sum + (g.price - g.avg) * g.held, 0) : null,
  };
}
