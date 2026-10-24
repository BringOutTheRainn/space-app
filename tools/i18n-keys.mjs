// Lists the English text in the game data that a translation still lacks.
// Usage: npm run build && node tools/i18n-keys.mjs
import { UPGRADES } from '../www/js/data/upgrades.js';
import { ACHIEVEMENTS } from '../www/js/data/achievements.js';
import { GENERATORS } from '../www/js/data/generators.js';
import { COSMIC } from '../www/js/data/cosmic.js';
import { ANOMALIES } from '../www/js/data/anomalies.js';
import { DESTINATIONS, RELICS } from '../www/js/data/expeditions.js';
import { NEWS } from '../www/js/data/news.js';
import { SKINS, PRODUCTS } from '../www/js/data/store.js';
import { CONTRACTS } from '../www/js/core/contracts.js';
import { EVENT_GENS, EVENT_THEMES, BADGE_NAMES } from '../www/js/core/event.js';
import { SPELLS } from '../www/js/core/forge.js';
import { SEEDS } from '../www/js/core/garden.js';
import { GOODS } from '../www/js/core/market.js';
import { REMINDER_TEXT } from '../www/js/core/notify.js';
import { SLICES } from '../www/js/core/wheel.js';
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
// Tables in core/ whose text the UI passes to t(). A spell's desc is shown through a phrase with numbers instead.
const fields = (list, names) => { for (const x of list) for (const f of names) if (typeof x[f] === 'string') keys.add(x[f]); };
fields(SKINS, ['name']);
fields(PRODUCTS, ['name', 'desc']);
fields(CONTRACTS, ['name', 'goalText']);
fields(EVENT_GENS, ['name']);
fields(EVENT_THEMES, ['name', 'flavor']);
fields(SPELLS, ['name']);
fields(SEEDS, ['name', 'desc']);
fields(GOODS, ['name', 'short']);
fields(SLICES, ['label']);
for (const k of [...BADGE_NAMES, ...REMINDER_TEXT]) keys.add(k);
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
// `npm test` runs this too, so a new string without its translations fails the build.
let total = 0;
for (const dict of [ES, PT, FR, DE]) total += [...keys].filter((k) => !(k in dict)).length;
if (total) process.exitCode = 1;
