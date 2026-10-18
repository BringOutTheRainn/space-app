// Saving, loading, migrations and offline progress.

import { GENERATORS } from '../data/generators.js';
import { earn, HYPER_MULT, type Derived } from './economy.js';
import { EVENT_GENS } from './event.js';
import { seedById, type Plot } from './garden.js';
import { GOODS, HISTORY } from './market.js';
import { newState, SAVE_VERSION, type GameState } from './state.js';

export const SAVE_KEY = 'stardust-empire-save';
/** A second copy, refreshed every few minutes, used if the main save is unreadable. */
export const BACKUP_KEY = SAVE_KEY + '-backup';
export const BACKUP_EVERY_MS = 5 * 60000;

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

type Migration = (raw: Record<string, unknown>) => void;

// MIGRATIONS[n] upgrades a version n save to version n + 1.
const MIGRATIONS: Record<number, Migration> = {};

/**
 * Puts back any top-level number that is not finite (NaN, Infinity or null)
 * with its starting value, so one bad value cannot break every later save.
 * Returns the names of the fields it fixed.
 */
export function repairNumbers(s: GameState, now = Date.now()): string[] {
  const base = newState(now) as unknown as Record<string, unknown>;
  const st = s as unknown as Record<string, unknown>;
  const fixed: string[] = [];
  for (const k of Object.keys(base)) {
    if (typeof base[k] === 'number' && !(typeof st[k] === 'number' && Number.isFinite(st[k]))) {
      st[k] = base[k];
      fixed.push(k);
    }
  }
  return fixed;
}

/**
 * Puts back the default for any list, record, text or flag whose type is wrong
 * (a hand-edited import or a damaged save), so one bad field cannot stop the
 * game from starting. Lists of records keep only their well-formed entries.
 */
function repairShapes(s: GameState, base: GameState): void {
  const st = s as unknown as Record<string, unknown>;
  const b = base as unknown as Record<string, unknown>;
  const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  for (const k of Object.keys(b)) {
    const want = b[k];
    const have = st[k];
    if (Array.isArray(want)) {
      if (!Array.isArray(have)) st[k] = want;
    } else if (isRecord(want)) {
      if (!isRecord(have)) st[k] = want;
    } else if (typeof want === 'string' || typeof want === 'boolean') {
      if (typeof have !== typeof want) st[k] = want;
    }
  }
  s.buffs = s.buffs.filter((x) => isRecord(x) && typeof x.kind === 'string' && Number.isFinite(x.endsAt));
  s.expeditions = s.expeditions.filter((x) => isRecord(x) && typeof x.id === 'string' && Number.isFinite(x.returnsAt));
  s.missions = s.missions.filter((x) => isRecord(x));
}

/** The first readable save among the main copy and the backup, or null. */
export function pickSave(main: string | null, backup: string | null, now = Date.now()): { state: GameState; from: 'main' | 'backup' } | null {
  for (const [text, from] of [[main, 'main'], [backup, 'backup']] as const) {
    if (!text) continue;
    try {
      return { state: deserialize(text, now), from };
    } catch {
      /* try the next copy */
    }
  }
  return null;
}

/** Parses a save, filling any missing fields with defaults. Throws on garbage. */
export function deserialize(text: string, now = Date.now()): GameState {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') throw new Error('Not a Stardust Empire save');
  // A NaN that slipped into a save is written as null; keep the rest of the save.
  if (raw.stardust === null && typeof raw.earnedAll === 'number') raw.stardust = 0;
  if (typeof raw.stardust !== 'number') throw new Error('Not a Stardust Empire save');
  let version = typeof raw.version === 'number' ? raw.version : 1;
  while (version < SAVE_VERSION) {
    MIGRATIONS[version]?.(raw);
    version++;
  }
  const base = newState(now);
  const s = { ...base, ...raw, version: SAVE_VERSION } as GameState;
  repairShapes(s, base);
  s.settings = { ...base.settings, ...(raw.settings as object) };
  s.echoes = Math.max(0, Math.floor(Number(s.echoes) || 0));
  s.comebackAt = Math.max(0, Number(s.comebackAt) || 0);
  // Saves from before the Trophies badge count everything earned so far as seen.
  if (typeof raw.trophiesSeen !== 'number') s.trophiesSeen = Object.keys(s.achievements ?? {}).length;
  // New generators added after this save was made start at zero.
  const gens = Array.isArray(raw.generators) ? (raw.generators as number[]) : [];
  s.generators = GENERATORS.map((_, i) => (typeof gens[i] === 'number' && gens[i] >= 0 ? Math.floor(gens[i]) : 0));
  const levels = Array.isArray(raw.genLevels) ? (raw.genLevels as number[]) : [];
  s.genLevels = GENERATORS.map((_, i) => (typeof levels[i] === 'number' && levels[i] >= 0 ? Math.floor(levels[i]) : 0));
  const ev = raw.event as Record<string, unknown> | null | undefined;
  s.event = ev && typeof ev.week === 'number' && Array.isArray(ev.gens) && typeof ev.flux === 'number'
    ? { week: ev.week, flux: ev.flux, earned: Number(ev.earned) || 0, gens: EVENT_GENS.map((_, i) => Math.max(0, Math.floor(Number((ev.gens as unknown[])[i]) || 0))),
      last: Number(ev.last) || now, claimed: Math.min(4, Math.max(0, Math.floor(Number(ev.claimed) || 0))), adReadyAt: Number(ev.adReadyAt) || 0, pass: ev.pass === true }
    : null;
  const mk = raw.market as Record<string, unknown> | null | undefined;
  s.market = mk && typeof mk.last === 'number' && Array.isArray(mk.goods) && mk.goods.length === GOODS.length
    ? {
      last: mk.last,
      goods: GOODS.map((def, i) => {
        const g = (mk.goods as Array<Record<string, unknown>>)[i] ?? {};
        const price = Number(g.price) > 0 ? Number(g.price) : def.rest;
        const held = Math.max(0, Math.floor(Number(g.held) || 0));
        return { price, trend: Number(g.trend) || 0, held, avg: held ? Number(g.avg) || price : 0,
          hist: Array.isArray(g.hist) ? (g.hist as unknown[]).map(Number).filter((x) => x > 0).slice(-HISTORY) : [price] };
      }),
      tip: Number.isInteger(mk.tip) ? (mk.tip as number) : -1,
      tipTicks: Math.max(0, Math.floor(Number(mk.tipTicks) || 0)),
      tipAt: Number(mk.tipAt) || 0,
    }
    : null;
  s.purchases = raw.purchases && typeof raw.purchases === 'object' ? { ...(raw.purchases as Record<string, number>) } : {};
  const plots = Array.isArray(raw.garden) ? (raw.garden as unknown[]) : [];
  s.garden = plots.slice(0, 9).map((p) => {
    const q = p as Plot | null;
    return q && typeof q.seed === 'string' && typeof q.plantedAt === 'number' && seedById(q.seed) ? { seed: q.seed, plantedAt: q.plantedAt } : null;
  });
  for (const key of ['stardust', 'earnedRun', 'earnedAll'] as const) {
    if (!isFinite(s[key]) || s[key] < 0) s[key] = 0;
  }
  repairNumbers(s, now);
  return s;
}

/** Save string for the export box: base64 of the JSON. */
export function exportSave(s: GameState): string {
  const bytes = new TextEncoder().encode(serialize(s));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(code: string, now = Date.now()): GameState {
  const bin = atob(code.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return deserialize(new TextDecoder().decode(bytes), now);
}

export interface OfflineResult {
  seconds: number;
  counted: number;
  earned: number;
}

/**
 * Credits production for the time since the game was last seen, at the
 * offline rate and up to the offline cap. Also moves the game clock on so
 * comet boosts expire.
 */
export function applyOffline(s: GameState, d: Derived, now = Date.now()): OfflineResult {
  const seconds = Math.max(0, (now - s.lastSeen) / 1000);
  const from = s.lastSeen;
  s.lastSeen = now;
  if (seconds < 1) return { seconds: 0, counted: 0, earned: 0 };
  const counted = Math.min(seconds, d.offlineCapHours * 3600);
  // Hyperdrive keeps running while away: that share earns double.
  const hyperSecs = Math.min(counted, Math.max(0, Math.min(now, s.hyperEndsAt) - from) / 1000);
  const earned = d.baseSps * d.offlineRate * (counted + hyperSecs * (HYPER_MULT - 1));
  earn(s, earned);
  s.offlineEarnedAll += earned;
  s.time += seconds;
  s.buffs = s.buffs.filter((b) => b.endsAt > s.time);
  s.nextCometAt = Math.max(s.nextCometAt, s.time + 30);
  return { seconds, counted, earned };
}
