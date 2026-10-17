// Reminders scheduled when the app goes to the background. Only real events
// get a notification, at most one of each kind, so they stay welcome.

import { AD_CONFIG } from '../data/ads.js';
import { dailyReady, dayNumber } from './daily.js';
import type { Derived } from './economy.js';
import type { GameState } from './state.js';

export interface Reminder {
  /** Stable id per kind, so rescheduling replaces rather than duplicates. */
  id: number;
  at: number;
  title: string;
  body: string;
  /** The body as English sentences with their values, translated by the app before scheduling. */
  parts: ReminderPart[];
}

export interface ReminderPart {
  key: string;
  vars?: Record<string, number>;
}

/** Every reminder sentence, so tests can check each has a translation. */
export const REMINDER_TEXT = [
  'Storage full', 'Hyperdrive ended', 'Probe returned', 'Daily supply drop',
  'Your empire has stored {h} hours of Stardust and stopped collecting. Come empty it.',
  'Production is back to normal speed. Engage Hyperdrive again?',
  'An expedition is back with loot. Open it before you send the next one.',
  'A free supply drop is waiting.',
  'Keep your {n} day streak going.',
];

function reminder(id: number, at: number, title: string, ...parts: ReminderPart[]): Reminder {
  const fill = (p: ReminderPart) => p.key.replace(/\{(\w+)\}/g, (_, k: string) => String(p.vars?.[k] ?? ''));
  return { id, at, title, body: parts.map(fill).join(' '), parts };
}

const MIN_DELAY = 10 * 60000;
/** Daily reminders go out at this local hour. */
const DAILY_HOUR = 18;

/** Next local time at the given hour that is on or after `from`. */
function nextLocalHour(from: number, hour: number): number {
  const d = new Date(from);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() < from) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function planReminders(s: GameState, d: Derived, now = Date.now()): Reminder[] {
  const out: Reminder[] = [];
  if (d.baseSps > 0) {
    out.push(reminder(1, now + d.offlineCapHours * 3600000, 'Storage full',
      { key: 'Your empire has stored {h} hours of Stardust and stopped collecting. Come empty it.', vars: { h: d.offlineCapHours } }));
  }
  if (AD_CONFIG.enabled && s.hyperEndsAt > now) {
    out.push(reminder(2, s.hyperEndsAt, 'Hyperdrive ended', { key: 'Production is back to normal speed. Engage Hyperdrive again?' }));
  }
  const back = s.expeditions.map((e) => e.returnsAt).filter((t) => t > now);
  if (back.length) {
    out.push(reminder(3, Math.min(...back), 'Probe returned', { key: 'An expedition is back with loot. Open it before you send the next one.' }));
  }
  // Daily drop: remind the evening of the next day it is ready.
  const readyAt = dailyReady(s, now) ? now : nextLocalHour(now, 0);
  const parts: ReminderPart[] = [{ key: 'A free supply drop is waiting.' }];
  if (s.dailyStreak > 1 && s.dailyLastDay >= dayNumber(now) - 1) parts.push({ key: 'Keep your {n} day streak going.', vars: { n: s.dailyStreak } });
  out.push(reminder(4, nextLocalHour(Math.max(readyAt, now + MIN_DELAY), DAILY_HOUR), 'Daily supply drop', ...parts));
  return out.filter((r) => r.at - now >= MIN_DELAY).sort((a, b) => a.at - b.at);
}
