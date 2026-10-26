// Release checklist for a Play upload. Prints what still points at test or
// unpublished settings. Warnings only: a closed test can ship with test ads
// while AdMob reviews the app. Usage: node tools/preflight.mjs
// In GitHub Actions the warnings also show on the run summary.
import { readFileSync } from 'node:fs';

const gha = !!process.env.GITHUB_ACTIONS;
const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.log(gha ? `::warning title=Release check::${msg}` : `! ${msg}`);
};
const ok = (msg) => console.log(`ok ${msg}`);

const ads = readFileSync('src/data/ads.ts', 'utf8');
if (/testing:\s*true/.test(ads)) warn('Ads are in test mode (AD_CONFIG.testing in src/data/ads.ts). Real ads need it set to false.');
else ok('ads are not in test mode');
if (ads.includes('ca-app-pub-3940256099942544')) warn('src/data/ads.ts still has Google\'s test ad unit IDs. Put your AdMob unit IDs there.');
else ok('ad unit IDs are your own');
const appId = process.env.ADMOB_APP_ID ?? '';
if (!appId || appId.startsWith('ca-app-pub-3940256099942544')) warn('ADMOB_APP_ID is not set, so the build uses Google\'s test AdMob app ID. Set the repository variable ADMOB_APP_ID.');
else ok('AdMob app ID is set');

const pkg = JSON.parse(readFileSync('package.json', 'utf8')).version;
const shown = /export const VERSION = '([^']+)'/.exec(readFileSync('src/ui/menus.ts', 'utf8'))?.[1];
if (pkg !== shown) warn(`package.json says version ${pkg} but Settings shows ${shown}.`);
else ok(`version ${pkg}`);

const url = /export const PRIVACY_URL = '([^']+)'/.exec(readFileSync('src/ui/menus.ts', 'utf8'))?.[1];
try {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  if (res.ok) ok(`privacy policy is online (${url})`);
  else warn(`The privacy policy link returns ${res.status}: ${url}. Play rejects apps whose policy page is missing; merge docs/PRIVACY.md into main.`);
} catch {
  warn(`Could not reach the privacy policy link (${url}); check it opens before submitting.`);
}

console.log(warnings.length ? `${warnings.length} item(s) to finish before a production release.` : 'Ready for a production release.');
