// The shared context the screens use to read and change the game.

import type { Derived } from '../core/economy.js';
import type { BuyAmountSetting, GameState } from '../core/state.js';
import type { Sky } from './sky.js';

export type BuyAmount = 1 | 10 | 100 | 'next' | 'max';

export function buyAmountFrom(v: BuyAmountSetting): BuyAmount {
  return (v === 'max' || v === 'next' ? v : Number(v)) as BuyAmount;
}

export interface Ctx {
  s: GameState;
  d: Derived;
  sky: Sky;
  buyAmount: BuyAmount;
  /** Recompute derived numbers after a purchase or state change. */
  recalc(): void;
  save(): void;
  /** True while saves fail in a browser (storage full or blocked). */
  saveFailing: boolean;
  /** Swap in a new state (import, hard reset). */
  replaceState(s: GameState): void;
  /** Force every panel to rebuild on the next refresh. */
  dirty(): void;
  showTab(id: string): void;
}

export interface Panel {
  /** Called a few times a second while the tab is visible. */
  refresh(ctx: Ctx): void;
}
