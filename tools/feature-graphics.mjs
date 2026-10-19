// Renders the Google Play feature graphic (1024 x 500) in every listing language,
// from resources/feature.svg with the tagline swapped for each one:
//   node tools/feature-graphics.mjs <dir>
// writes <dir>/feature-graphic.png (English) and feature-graphic-<locale>.png.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const out = process.argv[2] ?? 'resources';
const TAGLINES = {
  '': 'Tap. Build. Collapse the universe.',
  'es-419': 'Toca. Construye. Colapsa el universo.',
  'pt-BR': 'Toque. Construa. Colapse o universo.',
  'fr-FR': "Touchez. Construisez. Effondrez l'univers.",
  'de-DE': 'Tippe. Baue. Lass das Universum kollabieren.',
};
const svg = readFileSync('resources/feature.svg', 'utf8');
const english = TAGLINES[''];
if (!svg.includes(`>${english}<`)) throw new Error('feature.svg tagline changed; update TAGLINES');

mkdirSync(out, { recursive: true });
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
for (const [locale, line] of Object.entries(TAGLINES)) {
  const text = line.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', '<svg width="1024" height="500" ').replace(`>${english}<`, `>${text}<`)}</body></html>`);
  // Longer translations shrink to stay inside the right edge.
  const size = await page.evaluate(() => {
    const t = [...document.querySelectorAll('text')].pop();
    let px = Number(t.getAttribute('font-size'));
    while (t.getBBox().x + t.getBBox().width > 1000 && px > 16) t.setAttribute('font-size', String(--px));
    return px;
  });
  const name = locale ? `feature-graphic-${locale}.png` : 'feature-graphic.png';
  await page.screenshot({ path: join(out, name) });
  console.log('wrote', name, `(tagline ${size}px)`);
}
await browser.close();
