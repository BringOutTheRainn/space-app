// Phone clocks get moved: a player sets the date ahead to skip a wait, or the clock was wrong
// and the network fixes it. Time stamps written under the later clock would then sit in the
// future and lock timers for as long as the clock moved (weeks, for a skipped month).

import { AD_CONFIG } from '../data/ads.js';
import { CRYSTAL_HOURS } from './crystals.js';
import { EVENT_AD_COOLDOWN_MINUTES } from './event.js';
import { STOKE_COOLDOWN_HOURS } from './forge.js';
import { FERTILIZE_COOLDOWN_HOURS } from './garden.js';
import { TIP_COOLDOWN_HOURS } from './market.js';
import type { GameState } from './state.js';

const HOUR = 3600000;

/**
 * Pulls every real-time stamp back within reach of `now` after the clock went backwards:
 * a "when it happened" stamp is no later than now, and a "ready at" stamp is no further off
 * than its full wait. Does nothing when the clock is right.
 */
export function fixClockJump(s: GameState, now: number): void {
  // Written as comparisons so a missing or junk value is left for the save checks to handle.
  const past = (t: number): number => (t > now ? now : t);
  const wait = (t: number, ms: number): number => (t > now + ms ? now + ms : t);
  s.vaultAt = past(s.vaultAt);
  s.forgeHeatAt = past(s.forgeHeatAt);
  s.rateAskedAt = past(s.rateAskedAt);
  s.lastInterstitialAt = past(s.lastInterstitialAt);
  s.crystalNextAt = wait(s.crystalNextAt, CRYSTAL_HOURS * HOUR);
  s.gardenFertilizeAt = wait(s.gardenFertilizeAt, FERTILIZE_COOLDOWN_HOURS * HOUR);
  s.forgeAdAt = wait(s.forgeAdAt, STOKE_COOLDOWN_HOURS * HOUR);
  // Hyperdrive is a boost, not a wait: one that ends past its cap was timed by the wrong clock, so it ends.
  if (s.hyperEndsAt > now + AD_CONFIG.hyperCapMinutes * 60000) s.hyperEndsAt = now;
  for (const p of s.garden) if (p) p.plantedAt = past(p.plantedAt);
  for (const x of s.expeditions) {
    if (x.startedAt <= now) continue;
    // Keep the trip's length, starting it now.
    x.returnsAt = now + Math.max(0, x.returnsAt - x.startedAt);
    x.startedAt = now;
  }
  if (s.market) {
    s.market.last = past(s.market.last);
    s.market.tipAt = wait(s.market.tipAt, TIP_COOLDOWN_HOURS * HOUR);
  }
  if (s.event) s.event.adReadyAt = wait(s.event.adReadyAt, EVENT_AD_COOLDOWN_MINUTES * 60000);
}
