// "What's new" shown once to players who update. Newest first. Add an entry with every
// release that changes something players will notice; each line needs Spanish,
// Portuguese, French and German in src/i18n (a test checks). The first release has none: nobody updates to it.

export interface ChangelogEntry {
  version: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [];
