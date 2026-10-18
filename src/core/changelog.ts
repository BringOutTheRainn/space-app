// Which "What's new" entries a player has not seen yet.

import type { ChangelogEntry } from '../data/changelog.js';

/** Compares dotted version numbers: below 0 when a is older than b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Entries newer than the version the player last ran, up to the current one, newest first.
 * A save that never recorded a version (a new player) sees nothing.
 */
export function unseenChanges(log: ChangelogEntry[], seen: string, current: string): ChangelogEntry[] {
  if (!seen) return [];
  return log
    .filter((e) => compareVersions(e.version, seen) > 0 && compareVersions(e.version, current) <= 0 && e.items.length)
    .sort((a, b) => compareVersions(b.version, a.version));
}
