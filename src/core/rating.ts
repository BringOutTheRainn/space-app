// When to ask for a Google Play rating: never in the first two days or the
// first hour of play, then only after a happy moment, at most once every 30
// days and three times in all. Rating is never rewarded (Play policy).

import type { GameState } from './state.js';

const DAY = 86400000;
export const RATE_MIN_DAYS = 2;
export const RATE_MIN_PLAY_SECONDS = 3600;
export const RATE_GAP_DAYS = 30;
export const RATE_MAX_ASKS = 3;

export function shouldAskRating(s: GameState, now = Date.now()): boolean {
  if (s.rateDone || s.rateAsks >= RATE_MAX_ASKS) return false;
  if (s.playSeconds < RATE_MIN_PLAY_SECONDS) return false;
  if (now - s.startedAt < RATE_MIN_DAYS * DAY) return false;
  return now - s.rateAskedAt >= RATE_GAP_DAYS * DAY;
}

export function markRatingAsked(s: GameState, now = Date.now()): void {
  s.rateAsks++;
  s.rateAskedAt = now;
}

/** Rated, or asked never to be asked again. */
export function markRatingDone(s: GameState): void {
  s.rateDone = true;
}
