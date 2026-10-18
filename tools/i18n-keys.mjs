// Lists the English text in the game data that a translation still lacks.
// Usage: npm run build && node tools/i18n-keys.mjs
import { UPGRADES } from '../www/js/data/upgrades.js';
import { ACHIEVEMENTS } from '../www/js/data/achievements.js';
import { GENERATORS } from '../www/js/data/generators.js';
import { COSMIC } from '../www/js/data/cosmic.js';
import { ANOMALIES } from '../www/js/data/anomalies.js';
import { DESTINATIONS, RELICS } from '../www/js/data/expeditions.js';
import { NEWS } from '../www/js/data/news.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ES } from '../www/js/i18n/es.js';
import { PT } from '../www/js/i18n/pt.js';
import { FR } from '../www/js/i18n/fr.js';
import { DE } from '../www/js/i18n/de.js';

const keys = new Set();
const add = (x) => {
  if (x.nameP) { keys.add(x.nameP[0]); for (const v of Object.values(x.nameP[1])) if (typeof v === 'string') keys.add(v); } else keys.add(x.name);
  if (x.descP) { keys.add(x.descP[0]); for (const v of Object.values(x.descP[1])) if (typeof v === 'string') keys.add(v); } else keys.add(x.desc);
};
for (const list of [UPGRADES, ACHIEVEMENTS]) list.forEach(add);
for (const g of GENERATORS) { keys.add(g.name); keys.add(g.flavor); }
for (const list of [COSMIC, DESTINATIONS, RELICS]) list.forEach(add);
for (const a of ANOMALIES) { keys.add(a.name); keys.add(a.rule); keys.add(a.rewardText); }
for (const n of NEWS) keys.add(n.text);
// Literal text passed to t() anywhere in the source.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []));
for (const file of walk('src')) {
  if (file.includes('i18n')) continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bt\((['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(m[2].replace(/\\(.)/g, '$1'));
}
for (const [lang, dict] of [['es', ES], ['pt', PT], ['fr', FR], ['de', DE]]) {
  const miss = [...keys].filter((k) => !(k in dict));
  console.log(`${lang}: ${miss.length} missing of ${keys.size}`);
  if (process.argv.includes('--list')) for (const k of miss) console.log('  ' + JSON.stringify(k));
}
