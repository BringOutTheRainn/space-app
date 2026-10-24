// Awards achievements whose conditions are met.

import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements.js';
import type { GameState } from './state.js';

/** Marks newly met achievements as earned and returns their ids. */
export function checkAchievements(s: GameState, sps: number, now = Date.now()): string[] {
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (a.id in s.achievements) continue;
    if (a.check(s, sps)) {
      s.achievements[a.id] = now;
      fresh.push(a.id);
    }
  }
  return fresh;
}

/** For achievements awarded by events rather than state checks. */
export function grantAchievement(s: GameState, id: string, now = Date.now()): boolean {
  if (id in s.achievements) return false;
  s.achievements[id] = now;
  return true;
}

/** How far along a counted achievement is, from 0 to 1, or null when it has no count. */
export function achievementProgress(a: AchievementDef, s: GameState, sps: number): number | null {
  if (a.goal === undefined || !a.value) return null;
  const v = Math.max(0, a.value(s, sps));
  const f = v / a.goal;
  return Math.min(1, Number.isFinite(f) ? f : 0);
}

/** The visible, unearned achievements closest to done, most progress first. */
export function closestAchievements(s: GameState, sps: number, limit = 3): Array<{ a: AchievementDef; p: number }> {
  const out: Array<{ a: AchievementDef; p: number }> = [];
  for (const a of ACHIEVEMENTS) {
    if (a.hidden || a.id in s.achievements) continue;
    const p = achievementProgress(a, s, sps);
    if (p !== null && p > 0 && p < 1) out.push({ a, p });
  }
  return out.sort((x, y) => y.p - x.p).slice(0, limit);
}
