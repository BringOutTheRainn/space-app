// The "Enjoying Stardust Empire?" prompt. It opens the game's Google Play page;
// it only runs in the Android app, after a happy moment.

import { markRatingAsked, markRatingDone, shouldAskRating } from '../core/rating.js';
import type { Ctx } from './ctx.js';
import { modalOpen, openModal } from './dom.js';
import { isNative } from './platform.js';

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.bringouttherainn.stardustempire';

let pendingAt = 0;

/** A collapse, a jackpot or a Golden Orbit: ask a little later, once things settle. */
export function noteHappyMoment(delayMs = 6000): void {
  pendingAt = Date.now() + delayMs;
}

export function openPlayPage(): void {
  const a = document.createElement('a');
  a.href = PLAY_URL;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
}

/** Called from the slow refresh; shows the prompt when one is due. */
export function maybeAskRating(ctx: Ctx, now = Date.now()): void {
  if (!pendingAt || now < pendingAt || modalOpen()) return;
  pendingAt = 0;
  if (!isNative() || !shouldAskRating(ctx.s, now)) return;
  markRatingAsked(ctx.s, now);
  ctx.save();
  showRatingPrompt(ctx);
}

export function showRatingPrompt(ctx: Ctx): void {
  openModal({
    title: 'Enjoying Stardust Empire?',
    body: '<p>A rating on Google Play helps other players find the game. It only takes a moment.</p>',
    buttons: [
      { label: 'Rate on Google Play', kind: 'primary', onClick: () => { markRatingDone(ctx.s); ctx.save(); openPlayPage(); } },
      { label: 'Not now', kind: 'plain' },
      { label: "Don't ask again", kind: 'plain', onClick: () => { markRatingDone(ctx.s); ctx.save(); } },
    ],
  });
}
