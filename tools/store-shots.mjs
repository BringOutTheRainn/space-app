// Google Play phone screenshots: 1080 x 1920 PNGs, each a game screen with a
// caption above it. Usage: npm run build && node tools/store-shots.mjs <outDir> [en|es|pt|fr|de] [tablet]
// With "tablet", makes 1920 x 1080 landscape shots of the side-by-side tablet layout instead.
// The game picks its language from the phone's, so es, pt, fr and de shots are taken with that locale.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = resolve('www');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const out = process.argv[2] ?? 'store';
const lang = process.argv[3] ?? 'en';
const tablet = process.argv[4] === 'tablet';
const LOCALES = { en: 'en-US', es: 'es-419', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' };
// Captions: [title with <em>, subtitle] per shot, in order.
const CAPTIONS = {
  en: [
    ['Tap a rock. <em>Build an empire.</em>', 'Harvest Stardust and grow your asteroid into a star'],
    ['Catch <em>comets</em> for huge bonuses', 'Stardust Rushes, Lucky Hauls and 777x Supernova Taps'],
    ['Hundreds of <em>upgrades</em>', 'Synergies make your generators boost each other'],
    ['From asteroid to <em>black hole</em>', '14 generators, from Mining Drones to Warp Gates and beyond'],
    ['<em>Collapse</em> the universe', 'Earn Dark Matter and unlock permanent cosmic power'],
    ['Trade at the <em>Warp Exchange</em>', 'Buy low, sell high, and grow a Garden and a Forge too'],
    ['Spin <em>Lucky Orbit</em> every day', 'Free daily spins, Hyperdrive boosts and supply drops'],
    ['Always a <em>next goal</em>', 'Missions, achievements and expeditions. Your empire works while you are away'],
  ],
  es: [
    ['Toca una roca. <em>Crea un imperio.</em>', 'Recolecta Polvo Estelar y convierte tu asteroide en una estrella'],
    ['Atrapa <em>cometas</em> para grandes bonos', 'Ráfagas de Polvo Estelar, botines de suerte y toques Supernova x777'],
    ['Cientos de <em>mejoras</em>', 'Las sinergias hacen que tus generadores se potencien entre sí'],
    ['Del asteroide al <em>agujero negro</em>', '14 generadores, desde Drones Mineros hasta Portales Warp y más'],
    ['<em>Colapsa</em> el universo', 'Gana Materia Oscura y desbloquea poder cósmico permanente'],
    ['Comercia en el <em>Intercambio Warp</em>', 'Compra barato, vende caro, y cultiva un Jardín y una Forja'],
    ['Gira la <em>Órbita de la Suerte</em> cada día', 'Giros diarios gratis, Hiperimpulso y suministros'],
    ['Siempre una <em>nueva meta</em>', 'Misiones, logros y expediciones. Tu imperio trabaja mientras no estás'],
  ],
  pt: [
    ['Toque numa rocha. <em>Crie um império.</em>', 'Colete Poeira Estelar e transforme seu asteroide numa estrela'],
    ['Capture <em>cometas</em> para bônus enormes', 'Ondas de Poeira Estelar, saques da sorte e toques Supernova x777'],
    ['Centenas de <em>melhorias</em>', 'Sinergias fazem seus geradores se fortalecerem entre si'],
    ['Do asteroide ao <em>buraco negro</em>', '14 geradores, de Drones Mineradores a Portais de Dobra e além'],
    ['<em>Colapse</em> o universo', 'Ganhe Matéria Escura e libere poder cósmico permanente'],
    ['Negocie na <em>Bolsa de Dobra</em>', 'Compre barato, venda caro, e cultive um Jardim e uma Forja'],
    ['Gire a <em>Órbita da Sorte</em> todo dia', 'Giros diários grátis, Hiperpropulsão e suprimentos'],
    ['Sempre uma <em>nova meta</em>', 'Missões, conquistas e expedições. Seu império trabalha enquanto você está fora'],
  ],
  fr: [
    ['Touchez un caillou. <em>Bâtissez un empire.</em>', "Récoltez de la Poussière d'étoiles et faites de votre astéroïde une étoile"],
    ['Attrapez des <em>comètes</em> pour d\'énormes bonus', 'Ruées de poussière, Butins chanceux et Touchers supernova x777'],
    ["Des centaines d'<em>améliorations</em>", 'Les synergies font grandir vos générateurs ensemble'],
    ["De l'astéroïde au <em>trou noir</em>", '14 générateurs, des Drones miniers aux Portails de distorsion et au-delà'],
    ["<em>Effondrez</em> l'univers", 'Gagnez de la Matière noire et débloquez une puissance cosmique permanente'],
    ['Négociez à la <em>Bourse de distorsion</em>', 'Achetez bas, vendez haut, et cultivez un Jardin et une Forge'],
    ["Faites tourner l'<em>Orbite chanceuse</em>", 'Tours gratuits chaque jour, Hyperpropulsion et ravitaillements'],
    ['Toujours un <em>nouvel objectif</em>', 'Missions, succès et expéditions. Votre empire travaille pendant votre absence'],
  ],
  de: [
    ['Tippe auf einen Stein. <em>Bau ein Imperium.</em>', 'Ernte Sternenstaub und mach deinen Asteroiden zu einem Stern'],
    ['Fang <em>Kometen</em> für riesige Boni', 'Sternenstaub-Rausch, Glücksfunde und Supernova-Tipps x777'],
    ['Hunderte <em>Verbesserungen</em>', 'Synergien lassen deine Generatoren gemeinsam wachsen'],
    ['Vom Asteroiden zum <em>Schwarzen Loch</em>', '14 Generatoren, von Bergbaudrohnen bis zu Warp-Toren und weiter'],
    ['<em>Kollabiere</em> das Universum', 'Verdiene Dunkle Materie und schalte dauerhafte kosmische Kraft frei'],
    ['Handle an der <em>Warp-Börse</em>', 'Günstig kaufen, teuer verkaufen, dazu ein Garten und eine Schmiede'],
    ['Dreh den <em>Glücksorbit</em>', 'Jeden Tag Gratis-Drehs, Hyperantrieb und Lieferungen'],
    ['Immer ein <em>neues Ziel</em>', 'Missionen, Erfolge und Expeditionen. Dein Imperium arbeitet, während du weg bist'],
  ],
};
const cap = CAPTIONS[lang];
if (!cap) throw new Error(`Unknown language ${lang}`);
mkdirSync(out, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
// 360 x 640 at 3x is 1080 x 1920; the game is framed slightly smaller under the caption.
// Tablet: 1280 x 720 at 1.5x is 1920 x 1080, framed under the caption the same way.
const page = tablet
  ? await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, hasTouch: true, locale: LOCALES[lang] })
  : await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: LOCALES[lang] });
const [W, H] = tablet ? [1920, 1080] : [1080, 1920];
const frame = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const game = (fn, arg) => page.evaluate(fn, arg);
const menus = (name) => page.evaluate(async (n) => {
  const m = await import('./js/ui/menus.js');
  m[n](window.__game.ctx, () => undefined);
}, name);
const closeModal = async () => {
  for (let i = 0; i < 5 && (await page.locator('.modal-x').count()); i++) {
    await page.locator('.modal-x').last().click();
    await page.waitForTimeout(300);
  }
};

async function shot(name, title, sub, toasts = false) {
  // Achievement pop-ups and tutorial hints crowd the marketing shots; only the comet shot keeps them.
  await page.evaluate((show) => {
    let st = document.getElementById('store-shot-style');
    if (!st) { st = document.createElement('style'); st.id = 'store-shot-style'; document.head.append(st); }
    st.textContent = show ? '' : '.toasts,.hint{display:none!important}';
  }, toasts);
  await page.waitForTimeout(700);
  const png = (await page.screenshot()).toString('base64');
  await frame.setContent(`<!doctype html><html lang="${lang}"><head><style>
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
    body{background:radial-gradient(ellipse at 50% 0%,#3a2a8a 0%,#1a1250 40%,#07051a 100%);font-family:'Inter Display','Inter',sans-serif;color:#fff;display:flex;flex-direction:column;align-items:center}
    .stars{position:absolute;inset:0;background-image:radial-gradient(2px 2px at 120px 90px,#fff8,transparent),radial-gradient(2px 2px at 900px 160px,#fff9,transparent),radial-gradient(3px 3px at 980px 60px,#9ff,transparent),radial-gradient(2px 2px at 60px 300px,#fff6,transparent),radial-gradient(2px 2px at 520px 40px,#fff7,transparent)}
    h1{position:relative;margin:96px 60px 0;font-size:82px;line-height:1.05;font-weight:800;text-align:center;letter-spacing:-1px;text-wrap:balance}
    h1 em{font-style:normal;color:#7ef0ff}
    p{position:relative;margin:22px 80px 0;font-size:38px;line-height:1.3;color:#c9c3f2;text-align:center;font-weight:500}
    img{position:relative;margin-top:56px;width:792px;height:1408px;border-radius:44px;box-shadow:0 0 0 10px #2b2266,0 30px 90px #000c,0 0 120px #6a5cff55}
    ${tablet ? 'h1{margin-top:44px;font-size:60px}p{margin-top:12px;font-size:28px}img{margin-top:30px;width:1504px;height:846px;border-radius:30px}' : ''}
  </style></head><body><div class="stars"></div><h1>${title}</h1><p>${sub}</p><img src="data:image/png;base64,${png}"></body></html>`);
  await frame.waitForTimeout(150);
  await frame.screenshot({ path: join(out, name + '.png') });
  console.log('saved', name);
}

await page.goto(url);
await page.waitForTimeout(800);
// Close the welcome and daily pop-ups.
await closeModal();

const box = await page.locator('#sky').boundingBox();
await game(() => {
  const { ctx } = window.__game;
  const s = ctx.s;
  s.stardust = 4.7e7; s.earnedRun = 9e7; s.earnedAll = 9e7; s.tapsAll = 900; s.tapEarnedRun = 4e5;
  s.generators = [45, 30, 22, 14, 8, 3, 0, 0, 0, 0, 0, 0, 0, 0];
  s.upgrades = { drone_0: true, drone_1: true, drone_2: true, harvester_0: true, harvester_1: true, lunar_0: true };
  ctx.recalc(); ctx.dirty();
});
for (let i = 0; i < 18; i++) await page.mouse.click(box.x + box.width / 2 + (i % 5) * 5, box.y + box.height / 2);
await shot('01_tap', ...cap[0]);

await game(() => window.__game.spawnComet(false));
await page.waitForTimeout(2500);
const pos = await game(() => window.__game.cometPosition());
if (pos) await page.mouse.click(box.x + pos[0], box.y + pos[1]);
await page.waitForTimeout(300);
await shot('02_comet', ...cap[1], true);

await closeModal();
await page.click('[data-tab="upgrades"]');
await shot('03_upgrades', ...cap[2]);

// Late game: everything unlocked.
await game(() => {
  const { ctx } = window.__game;
  const s = ctx.s;
  s.stardust = 3e17; s.earnedRun = 4e17; s.earnedAll = 9e18; s.darkMatter = 240; s.collapses = 4;
  s.cosmic = { glow: true, seed: true, magnet: true, fingers: true, kit: true, bay: true };
  s.generators = [180, 160, 140, 120, 100, 90, 70, 50, 35, 20, 8, 2, 0, 0];
  s.genLevels = s.genLevels.map((v, i) => (i < 10 ? Math.max(v, 2) : v));
  // Show the Golden Halo, the 28-day spin streak reward.
  s.haloEarned = true; s.haloOn = true; ctx.sky.halo = true;
  ctx.recalc(); ctx.dirty();
});
await page.click('[data-tab="build"]');
await shot('04_late', ...cap[3]);

await page.click('[data-tab="cosmos"]');
await shot('05_cosmos', ...cap[4]);

await page.click('[data-tab="build"]');
await page.evaluate(async () => {
  const m = await import('./js/core/market.js');
  const s = window.__game.ctx.s;
  // Run the exchange for a few hours so prices have history.
  s.market = null;
  let r = 0.37;
  const rng = () => (r = (r * 9301 + 49297) % 233280 / 233280);
  m.syncMarket(s, Date.now() - 4 * 3600000, rng);
  m.syncMarket(s, Date.now(), rng);
});
await menus('openMarket');
await shot('06_market', ...cap[5]);
await closeModal();

// Day 7 of a spin streak: the Golden Orbit is ready.
await page.evaluate(async () => {
  const { dayNumber } = await import('./js/core/daily.js');
  const s = window.__game.ctx.s;
  s.wheelStreak = 6; s.wheelStreakDay = dayNumber(Date.now()) - 1; s.wheelDay = -1;
});
await menus('openHyperdrive');
await shot('07_boosts', ...cap[6]);
await closeModal();

await menus('openMissions');
await shot('08_missions', ...cap[7]);
await closeModal();

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
server.close();
