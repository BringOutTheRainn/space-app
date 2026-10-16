// Lists the English text in the game data that Spanish or Portuguese still lack.
// Usage: npm run build && node tools/i18n-keys.mjs
import { UPGRADES } from '../www/js/data/upgrades.js';
import { ACHIEVEMENTS } from '../www/js/data/achievements.js';
import { GENERATORS } from '../www/js/data/generators.js';
import { ES } from '../www/js/i18n/es.js';
import { PT } from '../www/js/i18n/pt.js';

const keys = new Set();
const add = (x) => {
  if (x.nameP) { keys.add(x.nameP[0]); for (const v of Object.values(x.nameP[1])) if (typeof v === 'string') keys.add(v); } else keys.add(x.name);
  if (x.descP) { keys.add(x.descP[0]); for (const v of Object.values(x.descP[1])) if (typeof v === 'string') keys.add(v); } else keys.add(x.desc);
};
for (const list of [UPGRADES, ACHIEVEMENTS]) list.forEach(add);
for (const g of GENERATORS) { keys.add(g.name); keys.add(g.flavor); }
for (const [lang, dict] of [['es', ES], ['pt', PT]]) {
  const miss = [...keys].filter((k) => !(k in dict));
  console.log(`${lang}: ${miss.length} missing of ${keys.size}`);
  if (process.argv.includes('--list')) for (const k of miss) console.log('  ' + JSON.stringify(k));
}
