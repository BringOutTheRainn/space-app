// Modal screens: stats, settings, offline earnings and the daily reward.

import { markRatingDone } from '../core/rating.js';
import { noteHappyMoment, openPlayPage, PLAY_URL } from './rating.js';
import { AUTO_LANGS, LANG_NAMES, currentLang, t, type Lang, type LangSetting } from '../i18n/index.js';
import { STAGES, stageFor } from './sky.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { GENERATORS } from '../data/generators.js';
import { UPGRADES, pluralName } from '../data/upgrades.js';
import { claimDaily, dailyReward, nextStreakDay, rewardMinutes } from '../core/daily.js';
import { fmt, fmtDec, fmtLong, fmtPercent, fmtRate, fmtTime, setNumberStyle } from '../core/format.js';
import { exportSave, importSave } from '../core/save.js';
import { achievementCount, newState, totalGenerators, upgradeCount } from '../core/state.js';
import { setMusic, setSound, sfxAchievement, sfxBuy, sfxDenied, sfxTap } from './audio.js';
import type { Ctx } from './ctx.js';
import { closeModal, confirmModal, esc, openModal, toast } from './dom.js';
import { icon } from './icons.js';
import { copyText, haptic, isNative, setVibration, shareText } from './platform.js';
import { notificationsSupported, requestNotifications } from './notify.js';
import { errorReport, hasErrors } from './errors.js';
import { adPrivacyOptionsAvailable, rewardedAvailable, showAdPrivacyOptions, showRewarded } from './ads.js';
import { BUFF_MULT, earn } from '../core/economy.js';
import { AD_CONFIG } from '../data/ads.js';
import { boostMult, frenzyCooldown, frenzyReady, grantFrenzy, grantHyper, hyperCanStack, hyperRemainingMs } from '../core/ads.js';
import { claimContract, contractClaimable, contractProgress, contractTimeLeft, currentContract, MEDAL_PCT, tierReward } from '../core/contracts.js';
import { AD_SPEEDUP_HOURS, CRYSTAL_HOURS, LEVEL_PCT, crystalProgress, levelCost, levelUp, speedUpCrystal } from '../core/crystals.js';
import { GENERATORS as GENS } from '../data/generators.js';
import { generatorVisible } from '../core/economy.js';
import { FERTILIZE_COOLDOWN_HOURS, FERTILIZE_HOURS, GARDEN_GEN, SEEDS, fertilize, fertilizeReady, harvest, harvestAll, harvestValue, plant, plotCount, plotProgress, plotReady, readyPlots, seedById } from '../core/garden.js';
import { BADGE_GOALS, BADGE_MINUTES, BADGE_NAMES, GOLD_TIER, PLATINUM_CRYSTALS, badgeCount, EVENT_AD_MINUTES, EVENT_GENS, badgeReady, badgeReward, buyEventGen, claimBadge, currentEvent, eventAdBoost, eventAdReady, eventPrice, eventRate, eventTap, eventTapOnce, eventDay, eventTheme, eventTimeLeft } from '../core/event.js';
import { FORGE_GEN, REFILL_MINUTES, SMELT_FAIL, SMELT_MINUTES, SPELLS, STOKE_COOLDOWN_HOURS, cast, heatFullIn, maxHeat, spellById, stoke, stokeReady, syncHeat } from '../core/forge.js';
import { GOODS, MARKET_GEN, TICK_MINUTES, TIP_COOLDOWN_HOURS, TIP_TICKS, buyGood, creditValue, holdSize, insiderTip, maxBuy, nextTickIn, sellGood, syncMarket, tipReady, type GoodState } from '../core/market.js';
import { AD_SPINS_PER_DAY, GOLDEN_MULT, HALO_STREAK, SLICES, STREAK_DAYS, adSpinsLeft, currentStreak, freeSpinReady, goldenReady, sliceValue, spin } from '../core/wheel.js';
import { buyProduct, productPrice } from './store.js';
import { PASS_TIERS, XP_PER_TIER, XP_RATES, claimPass, currentPass, passClaimable, passTier, passXp, seasonLabel, seasonTimeLeft, tierReward as passReward, type PassReward } from '../core/pass.js';
import type { AwayReport } from '../core/away.js';
import { claimMission, missionDone, missionProgress, missionReward, swapMission, type Mission } from '../core/missions.js';
import { CHANGELOG } from '../data/changelog.js';
import { unseenChanges } from '../core/changelog.js';

export const VERSION = '1.0.0';
export const PRIVACY_URL = 'https://github.com/BringOutTheRainn/space-app/blob/main/docs/PRIVACY.md';

/** The celestial body's next form and how far this universe is towards it. */
function nextForm(earned: number): string {
  const next = STAGES[stageFor(earned) + 1];
  if (!next) return t('Final form reached');
  return t('{name} at {n} ({pct})', { name: t(next.name), n: fmt(next.at), pct: fmtPercent(Math.min(0.999, earned / next.at)) });
}

export function openStats(ctx: Ctx): void {
  const long = (n: number): string => (currentLang() === 'en' ? fmtLong(n) : fmt(n));
  const render = (): string => {
    const { s, d } = ctx;
    const rows: Array<[string, string]> = [
      // English uses full number words; other languages use the short form.
      [t('Stardust in bank'), long(s.stardust)],
      [t('Earned this universe'), long(s.earnedRun)],
      [t('Next form'), nextForm(s.earnedRun)],
      [t('Earned all time'), long(s.earnedAll)],
      [t('Production'), t('{n} per second', { n: fmtRate(d.sps) })],
      [t('Best production'), t('{n} per second', { n: fmtRate(s.highestSps) })],
      [t('Production multiplier'), `x${fmt(d.globalMult, 2)}`],
      [t('Stardust per tap'), fmtRate(d.tap)],
      [t('Taps (this universe / all)'), `${fmt(s.tapsRun)} / ${fmt(s.tapsAll)}`],
      [t('Earned by tapping (all time)'), long(s.tapEarnedAll)],
      [t('Generators owned'), fmt(totalGenerators(s))],
      [t('Upgrades bought'), t('{n} of {total}', { n: upgradeCount(s), total: UPGRADES.length })],
      [t('Achievements'), t('{n} of {total}', { n: achievementCount(s), total: ACHIEVEMENTS.length })],
      [t('Comets caught (this universe / all)'), `${s.cometsRun} / ${s.cometsAll}`],
      [t('Universes collapsed'), String(s.collapses)],
      [t('Dark Matter'), fmt(s.darkMatter)],
      [t('Earned while away'), long(s.offlineEarnedAll)],
      [t('Expeditions completed'), String(s.expeditionsDone)],
      [t('Missions completed'), fmt(s.missionsDone)],
      [t('Event Gold badges'), String(s.eventGolds)],
      [t('Stardust Vaults opened'), String(s.vaultsOpened)],
      [t('Lucky Orbit spins'), String(s.wheelSpins)],
      [t('Warp Exchange profit'), t('{n} credits', { n: fmt(s.marketProfit) })],
      [t('Contract Medals'), `${s.contractMedals} (+${fmtPercent(s.contractMedals * MEDAL_PCT)})`],
      [t('Ads watched'), String(s.adsWatched)],
      [t('Login streak'), s.dailyStreak === 1 ? t('1 day') : t('{n} days', { n: s.dailyStreak })],
      [t('Time played'), fmtTime(s.playSeconds)],
      [t('This universe started'), t('{time} ago', { time: fmtTime((Date.now() - s.runStartedAt) / 1000) })],
    ];
    const gens = GENERATORS.map((g, i) => s.generators[i]
      ? `<tr><td>${esc(t(g.name))}</td><td>${s.generators[i]}</td><td>${fmtRate(d.genSps[i])}/s</td></tr>` : '').join('');
    const perHour = (r: { dm: number; secs: number }): string => {
      if (r.secs <= 0) return '-';
      const rate = (r.dm * 3600) / r.secs;
      return rate < 100 ? fmtDec(rate) : fmt(rate);
    };
    // The last universes, so players can see each collapse coming faster and paying more.
    const runs = s.pastRuns.map((r, i) => `<tr><td>${t('Universe {n}', { n: s.collapses - i })}</td><td>${fmtTime(r.secs)}</td>`
      + `<td>+${fmt(r.dm)}</td><td>${perHour(r)}</td></tr>`).join('');
    return `<table class="stats">${rows.map(([k, v]) => `<tr><td>${k}</td><td colspan="2">${v}</td></tr>`).join('')}</table>
      ${gens ? `<h3 class="section-title">${t('Generators')}</h3><table class="stats">${gens}</table>` : ''}
      ${runs ? `<h3 class="section-title">${t('Recent universes')}</h3><table class="stats past-runs"><tr><th></th><th>${t('Lasted')}</th><th>${t('Dark Matter')}</th><th>${t('Per hour')}</th></tr>${runs}</table>` : ''}`;
  };
  const el = openModal({
    title: t('Stats'), body: render(), wide: true, onClose: () => clearInterval(timer),
    buttons: [{ label: t('Share my empire'), kind: 'primary', onClick: () => { void shareEmpire(ctx); return false; } }],
  });
  const timer = setInterval(() => {
    const body = el.querySelector('.modal-body');
    if (body) body.innerHTML = render();
  }, 1000);
}

/** The line players share: their production, collapses and the Play link. */
export function shareLine(ctx: Ctx): string {
  const rate = fmtRate(Math.max(ctx.d.sps, ctx.s.highestSps));
  const brag = ctx.s.collapses === 1
    ? t('My space empire makes {n} Stardust per second and has collapsed its first universe. Can you beat it?', { n: rate })
    : ctx.s.collapses > 1
    ? t('My space empire makes {n} Stardust per second and has collapsed {c} universes. Can you beat it?', { n: rate, c: ctx.s.collapses })
    : t('My space empire makes {n} Stardust per second. Can you beat it?', { n: rate });
  return `${brag} ${t('Stardust Empire on Google Play:')} ${PLAY_URL}`;
}

async function shareEmpire(ctx: Ctx): Promise<void> {
  const text = shareLine(ctx);
  if (await shareText(text, t('Share my empire'))) return;
  if (await copyText(text)) toast(t('Copied. Paste it anywhere to share.'), 'good');
  else openModal({ title: t('Share my empire'), body: `<textarea class="code" readonly>${esc(text)}</textarea>` });
}

/**
 * Once per update, lists what changed since the version this save last ran on.
 * New players just get the current version recorded.
 */
export function showWhatsNew(ctx: Ctx): void {
  const s = ctx.s;
  if (s.versionSeen === VERSION) return;
  const fresh = unseenChanges(CHANGELOG, s.versionSeen, VERSION);
  s.versionSeen = VERSION;
  ctx.save();
  if (!fresh.length) return;
  const body = fresh.map((e) => `<h3 class="section-title">${esc(t('Version {v}', { v: e.version }))}</h3>
    <ul class="result-list">${e.items.map((x) => `<li>${esc(t(x))}</li>`).join('')}</ul>`).join('');
  openModal({ title: t("What's new"), body, buttons: [{ label: t('Got it'), kind: 'primary' }] });
}

function toggleRow(id: string, label: string, on: boolean): string {
  return `<label class="toggle"><span>${label}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="switch"></span></label>`;
}

function languageRow(setting: LangSetting): string {
  const opts: Array<[LangSetting, string]> = [['auto', t('Device language')], ...(Object.keys(LANG_NAMES) as Lang[]).map((l): [LangSetting, string] => [l, LANG_NAMES[l]])];
  const partial = currentLang() !== 'en' && !AUTO_LANGS.includes(currentLang());
  return `<label class="toggle lang-row"><span>${t('Language')}</span><select id="set-lang" class="select">
    ${opts.map(([v, name]) => `<option value="${v}"${v === setting ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
    ${partial ? `<p class="dim small">${t('Some text is still in English.')}</p>` : ''}`;
}

export function applySettings(ctx: Ctx): void {
  const st = ctx.s.settings;
  setSound(st.sound);
  setMusic(st.music);
  setVibration(st.vibration);
  setNumberStyle(st.numberStyle);
  ctx.sky.particlesOn = st.particles;
  const systemReduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  ctx.sky.reduceMotion = st.reduceMotion || systemReduce;
  document.documentElement.classList.toggle('reduce-motion', st.reduceMotion);
  ctx.sky.halo = ctx.s.haloEarned && ctx.s.haloOn;
  ctx.sky.setLowRes(st.saver);
}

export function openSettings(ctx: Ctx): void {
  const st = ctx.s.settings;
  const el = openModal({
    title: t('Settings'),
    body: `
      ${toggleRow('set-sound', t('Sound effects'), st.sound)}
      ${toggleRow('set-music', t('Ambient music'), st.music)}
      ${toggleRow('set-vibration', t('Vibration'), st.vibration)}
      ${toggleRow('set-particles', t('Particles'), st.particles)}
      ${toggleRow('set-motion', t('Reduce motion (no flashes, calmer sky)'), st.reduceMotion)}
      ${toggleRow('set-saver', t('Battery saver (30 fps, lighter sky)'), st.saver)}
      ${toggleRow('set-sci', t('Scientific notation'), st.numberStyle === 'scientific')}
      ${notificationsSupported() ? toggleRow('set-notify', t('Reminders (storage full, probes back, daily drop)'), st.notifications) : ''}
      ${languageRow(st.lang)}
      <h3 class="section-title">${t('Save')}</h3>
      <p class="dim">${t('Progress saves automatically on this device. Copy your save code to keep a backup or move to another device.')}</p>
      <div class="btn-row"><button class="btn btn-plain" id="btn-export">${t('Copy save code')}</button><button class="btn btn-plain" id="btn-import">${t('Load save code')}</button></div>
      ${hasErrors() ? `<h3 class="section-title">${t('Problems')}</h3><p class="dim">${t('The game caught an error. If something looked wrong, copy this report and send it to the developer.')}</p><button class="btn btn-plain" id="btn-errors">${t('Copy error report')}</button>` : ''}
      ${adPrivacyOptionsAvailable() ? `<h3 class="section-title">${t('Ads')}</h3><button class="btn btn-plain" id="btn-ad-privacy">${t('Ad privacy choices')}</button>` : ''}
      ${isNative() ? `<button class="btn btn-plain" id="btn-rate">${t('Rate on Google Play')}</button>` : ''}
      <h3 class="section-title">${t('Danger zone')}</h3>
      <button class="btn btn-danger" id="btn-reset">${t('Erase all progress')}</button>
      <p class="dim small">Stardust Empire ${VERSION} · <a class="link" href="${PRIVACY_URL}" target="_blank" rel="noopener">${t('Privacy policy')}</a></p>`,
  });
  const bind = (id: string, fn: (on: boolean) => void): void => {
    el.querySelector<HTMLInputElement>('#' + id)!.addEventListener('change', (e) => {
      fn((e.target as HTMLInputElement).checked);
      applySettings(ctx);
      ctx.save();
      ctx.dirty();
    });
  };
  bind('set-sound', (on) => (st.sound = on));
  bind('set-music', (on) => (st.music = on));
  bind('set-vibration', (on) => {
    st.vibration = on;
    if (on) setTimeout(() => haptic('medium'));
  });
  bind('set-particles', (on) => (st.particles = on));
  bind('set-motion', (on) => (st.reduceMotion = on));
  bind('set-saver', (on) => {
    st.saver = on;
    st.saverAuto = true;
  });
  bind('set-sci', (on) => (st.numberStyle = on ? 'scientific' : 'short'));
  el.querySelector<HTMLSelectElement>('#set-lang')!.addEventListener('change', (e) => {
    st.lang = (e.target as HTMLSelectElement).value as LangSetting;
    ctx.save();
    // Every screen is drawn in the chosen language at start, so restart the page.
    location.reload();
  });
  el.querySelector<HTMLInputElement>('#set-notify')?.addEventListener('change', (e) => {
    const box = e.target as HTMLInputElement;
    if (!box.checked) {
      st.notifications = false;
      ctx.save();
      return;
    }
    void requestNotifications().then((ok) => {
      st.notifications = ok;
      box.checked = ok;
      if (!ok) toast(t('Notifications are blocked. You can allow them in your phone settings.'), 'info');
      ctx.save();
    });
  });

  el.querySelector('#btn-rate')?.addEventListener('click', () => { markRatingDone(ctx.s); ctx.save(); openPlayPage(); });
  el.querySelector('#btn-errors')?.addEventListener('click', async () => {
    const report = errorReport(VERSION);
    if (await copyText(report)) toast(t('Error report copied'), 'good');
    else openModal({ title: t('Error report'), body: `<textarea class="code" readonly>${esc(report)}</textarea>` });
  });
  el.querySelector('#btn-ad-privacy')?.addEventListener('click', () => void showAdPrivacyOptions());
  el.querySelector('#btn-export')!.addEventListener('click', async () => {
    ctx.save();
    const code = exportSave(ctx.s);
    const ok = await copyText(code);
    if (ok) toast(t('Save code copied to the clipboard.'), 'good');
    else openModal({ title: t('Your save code'), body: `<p class="dim">${t('Copy all of this text and keep it somewhere safe.')}</p><textarea class="code" readonly>${esc(code)}</textarea>` });
  });
  el.querySelector('#btn-import')!.addEventListener('click', () => {
    openModal({
      title: t('Load save code'),
      body: `<p class="dim">${t('Paste a save code. This replaces your current progress.')}</p><textarea class="code" id="import-text" placeholder="${t('Paste here')}"></textarea>`,
      buttons: [
        { label: t('Cancel') },
        {
          label: t('Load'), kind: 'primary', onClick: (root) => {
            const text = root.querySelector<HTMLTextAreaElement>('#import-text')!.value;
            try {
              const s = importSave(text);
              ctx.replaceState(s);
              closeModal(el);
              toast(t('Save loaded.'), 'good');
              return true;
            } catch {
              toast(t('That save code did not work. Check it was copied completely.'), 'bad');
              return false;
            }
          },
        },
      ],
    });
  });
  el.querySelector('#btn-reset')!.addEventListener('click', () => {
    confirmModal(t('Erase everything?'), t('This deletes all progress, including Dark Matter and achievements. It cannot be undone.'), t('Erase'), () => {
      confirmModal(t('Really erase?'), t('Last chance. Your whole empire will be gone.'), t('Yes, erase it all'), () => {
        ctx.replaceState(newState());
        closeModal(el);
        toast(t('A fresh start.'), 'info');
      }, true);
    }, true);
  });
}

function awayRows(r: AwayReport): string {
  const rows: Array<[string, string]> = [];
  if (r.giftMinutes) rows.push(['gift', t('Welcome-back gift: {time} of Hyperdrive (x2 production)', { time: fmtTime(r.giftMinutes * 60) })]);
  if (r.probes) rows.push(['probe', r.probes === 1 ? t('1 probe is back with loot') : t('{n} probes are back with loot', { n: r.probes })]);
  if (r.plants) rows.push(['sprout', r.plants === 1 ? t('1 plant is ready to harvest') : t('{n} plants are ready to harvest', { n: r.plants })]);
  if (r.crystals) rows.push(['crystal', r.crystals === 1 ? t('A Quasar Crystal formed') : t('{n} Quasar Crystals formed', { n: r.crystals })]);
  if (r.forgeFull) rows.push(['anvil', t('The Star Forge is at full heat')]);
  if (r.marketPL !== null) {
    const pl = fmt(Math.abs(r.marketPL));
    rows.push(['exchange', r.marketPL >= 0 ? t('Your goods are up {n} credits', { n: pl }) : t('Your goods are down {n} credits', { n: pl })]);
  }
  if (r.flux >= 1) rows.push(['rift', t('+{n} event Flux', { n: fmt(r.flux) })]);
  if (r.vaultHours >= 1) rows.push(['darkMatter', t('Stardust Vault: {n} hours saved', { n: fmtDec(r.vaultHours) })]);
  if (!rows.length) return '';
  return `<ul class="away-list">${rows.map(([ico, text]) => `<li>${icon(ico)}<span>${esc(text)}</span></li>`).join('')}</ul>`;
}

export function showOffline(ctx: Ctx, seconds: number, earned: number, report?: AwayReport): void {
  if (earned <= 0 || seconds < 60) return;
  const buttons: Parameters<typeof openModal>[0]['buttons'] = [{ label: t('Collect'), kind: rewardedAvailable() ? 'plain' : 'primary' }];
  if (rewardedAvailable()) {
    buttons.push({
      label: t('Watch ad: x2'), kind: 'primary', onClick: () => {
        void showRewarded(t('double your offline Stardust')).then((ok) => {
          if (!ok) return;
          earn(ctx.s, earned);
          ctx.s.adsWatched++;
          ctx.save();
          ctx.sky.floatCenter(`+${fmt(earned)}`, '#ffcf5a', 30);
          toast(`<div class="t-ico">${icon('gift')}</div><div><b>${t('Doubled!')}</b><br>${t('+{n} more Stardust', { n: fmt(earned) })}</div>`, 'good');
        });
      },
    });
  }
  openModal({
    title: t('Welcome back!'),
    body: `<div class="offline"><div class="big-ico">${icon('drone')}</div>
      <p>${t('While you were away for <b>{time}</b>, your empire harvested', { time: fmtTime(seconds) })}</p>
      <p class="offline-amount"><span class="sd-dot big"></span>${fmt(earned)}</p><p class="dim">${t('Stardust')}</p>
      ${capNote(ctx, seconds)}
      ${report ? awayRows(report) : ''}</div>`,
    buttons,
    onClose: () => { if (seconds >= 1800) askReminders(ctx); },
  });
}

/** Says when storage filled up before the player came back, and how to hold more. */
function capNote(ctx: Ctx, seconds: number): string {
  const cap = ctx.d.offlineCapHours;
  if (seconds <= cap * 3600) return '';
  const more = cap < 24 ? ' ' + t('Cosmic upgrades let it hold more.') : '';
  return `<p class="dim small cap-note">${t('Storage filled up after {h} hours.', { h: cap })}${more}</p>`;
}

/** One polite ask, the first time a player comes back after a while. */
function askReminders(ctx: Ctx): void {
  const s = ctx.s;
  if (!notificationsSupported() || s.settings.notifications || s.seenHints.notifyAsk) return;
  s.seenHints.notifyAsk = true;
  ctx.save();
  openModal({
    title: t('Want a heads-up?'),
    body: `<div class="offline"><div class="big-ico">${icon('drone')}</div>
      <p>${t('Get a ping when your storage is full, a probe is back, or a gift or your daily drop is waiting. Nothing else.')}</p></div>`,
    buttons: [
      { label: t('No thanks') },
      {
        label: t('Yes, remind me'), kind: 'primary', onClick: () => {
          void requestNotifications().then((ok) => {
            s.settings.notifications = ok;
            ctx.save();
            if (ok) toast(t('Reminders on. Change this any time in Settings.'), 'good');
          });
        },
      },
    ],
  });
}

const SLICE_COLORS = ['#3b4cc0', '#ff7ad9', '#2a9d8f', '#ffcf5a', '#6b3cff', '#5ef0ff', '#e76f51', '#ffd700'];

function wheelSvg(rot: number, golden = false): string {
  const r = 92;
  const pt = (deg: number, rad = r): string => {
    const a = (deg * Math.PI) / 180;
    return `${(100 + rad * Math.sin(a)).toFixed(2)},${(100 - rad * Math.cos(a)).toFixed(2)}`;
  };
  const slices = SLICES.map((x, i) => {
    const mid = i * 45;
    const dark = i === 3 || i === 5 || i === 7;
    return `<path d="M100,100 L${pt(mid - 22.5)} A${r},${r} 0 0 1 ${pt(mid + 22.5)} Z" fill="${SLICE_COLORS[i]}" stroke="#0c0f23" stroke-width="2"/>
      ${mid > 90 && mid < 270
        ? `<text transform="rotate(${mid + 180} 100 100)" x="100" y="171" text-anchor="middle" class="wheel-label${dark ? ' dark' : ''}">${esc(t(x.label))}</text>`
        : `<text transform="rotate(${mid} 100 100)" x="100" y="34" text-anchor="middle" class="wheel-label${dark ? ' dark' : ''}">${esc(t(x.label))}</text>`}`;
  }).join('');
  return `<div class="wheel-wrap${golden ? ' golden' : ''}"><svg class="wheel-disc" viewBox="0 0 200 200" style="transform:rotate(${rot}deg)" aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill="#0c0f23"/>${slices}
      <circle cx="100" cy="100" r="16" fill="#141937" stroke="#ffcf5a" stroke-width="3"/></svg>
    <i class="wheel-pin"></i></div>`;
}

function prizeText(ctx: Ctx, i: number, amount: number, golden = false): string {
  const x = SLICES[i];
  const mult = golden ? GOLDEN_MULT : 1;
  if (x.kind === 'hyper') return t('Hyperdrive +{n} minutes', { n: x.minutes * mult });
  if (x.kind === 'comet') return amount ? t('A comet is on its way, and +{n} Stardust', { n: fmt(amount) }) : t('A comet is on its way');
  if (x.kind === 'crystal' && !amount) return mult > 1 ? t('+{n} Quasar Crystals', { n: mult }) : t('+1 Quasar Crystal');
  return i === 7 ? t('+{n} Stardust, the jackpot!', { n: fmt(amount) }) : t('+{n} Stardust', { n: fmt(amount) });
}

export function openHyperdrive(ctx: Ctx): void {
  let rot = 0;
  const render = (): string => {
    const s = ctx.s;
    const left = hyperRemainingMs(s);
    const can = hyperCanStack(s) && rewardedAvailable();
    const frenzyOn = s.buffs.find((b) => b.kind === 'frenzy');
    const wait = frenzyCooldown(s);
    const mult = boostMult();
    const frenzyText = ctx.d.noTaps ? t('Not available while tapping is disabled.')
      : frenzyOn ? t('Active: {time} left.', { time: `${Math.ceil(frenzyOn.endsAt - s.time)}s` })
      : wait > 0 ? t('Recharging: {time}.', { time: fmtTime(wait) }) : '';
    const free = freeSpinReady(s);
    const golden = goldenReady(s);
    const adLeft = adSpinsLeft(s);
    // Streak dots: days already spun this week of the streak, today's glowing while unused.
    const streak = currentStreak(s);
    const filled = streak % STREAK_DAYS === 0 && streak > 0 && !free ? STREAK_DAYS : streak % STREAK_DAYS;
    const dots = Array.from({ length: STREAK_DAYS }, (_, i) => `<i class="sdot${i < filled ? ' on' : ''}${free && i === filled ? ' today' : ''}${i === STREAK_DAYS - 1 ? ' gold' : ''}"></i>`).join('');
    const days = streak === 1 ? t('1 day') : t('{n} days', { n: streak });
    const streakLine = `<div class="wheel-streak" aria-label="${esc(t('Spin streak: {days} in a row', { days }))}">${dots}</div>
          <p class="dim small">${golden ? t('Day 7: a Golden Orbit. Prizes doubled, jackpot six times as likely.')
            : !free && streak > 0 && streak % STREAK_DAYS === 0 ? t('Golden Orbit claimed. Keep the streak going for the next one.')
            : t('Spin {n} days in a row for a Golden Orbit. Streak: {days}.', { n: STREAK_DAYS, days })}</p>
          ${s.haloEarned ? '' : `<p class="dim small">${t('Reach a {n}-day streak to earn the Golden Halo, a sky trail around your world.', { n: HALO_STREAK })}</p>`}`;
    const spinBtn = free ? `<button class="btn btn-primary${golden ? ' btn-golden' : ''}" data-spin="free">${golden ? t('Spin Golden Orbit') : t('Spin free')}</button>`
      : adLeft > 0 ? `<button class="btn ${rewardedAvailable() ? 'btn-primary' : 'btn-plain'}" data-spin="ad" ${rewardedAvailable() ? '' : 'disabled'}>${t('Ad spin: {n} left', { n: adLeft })}</button>`
      : `<p class="dim small">${t('Next free spin tomorrow.')}</p>`;
    return `<div class="boosts">
      <div class="wheel-card">
        ${wheelSvg(rot, golden)}
        <div class="wheel-side"><b>${golden ? t('Golden Orbit') : t('Lucky Orbit')}</b>
          <p>${t('One free spin every day and {n} more with an ad. Up to 8 hours of production, Hyperdrive, comets and crystals.', { n: AD_SPINS_PER_DAY })}</p>
          ${streakLine}
          ${spinBtn}</div>
      </div>
      ${mult > 1 ? `<p class="ev-pass-on">${t('Double weekend: boosts last twice as long while the weekend event runs.')}</p>` : ''}
      <div class="boost">
        <div class="boost-ico">${icon('probe')}</div>
        <div class="boost-main"><b>${t('Hyperdrive')}</b>
          <p>${t('Double all production for {n} hours. Keeps running while you are away and stacks up to {cap} hours.', { n: (AD_CONFIG.hyperMinutes * mult) / 60, cap: AD_CONFIG.hyperCapMinutes / 60 })}</p>
          ${left > 0 ? `<p class="dim small">${t('Active: {time} left.', { time: fmtTime(left / 1000) })}</p>` : ''}
          ${hyperCanStack(s) ? '' : `<p class="dim small">${t('Fully charged. Come back when it runs lower.')}</p>`}</div>
        <button class="btn ${can ? 'btn-primary' : 'btn-plain'}" data-boost="hyper" ${can ? '' : 'disabled'}>${t('Watch ad')}</button>
      </div>
      <div class="boost">
        <div class="boost-ico">${icon('tap')}</div>
        <div class="boost-main"><b>${t('Tap Frenzy')}</b>
          <p>${t('For {n} seconds, probes tap {rate} times a second and every tap is worth x{mult}.', { n: AD_CONFIG.frenzySeconds * mult, rate: AD_CONFIG.frenzyTapsPerSecond, mult: BUFF_MULT.frenzy })}</p>
          ${frenzyText ? `<p class="dim small">${frenzyText}</p>` : ''}</div>
        <button class="btn ${frenzyUsable() ? 'btn-primary' : 'btn-plain'}" data-boost="frenzy" ${frenzyUsable() ? '' : 'disabled'}>${t('Watch ad')}</button>
      </div>
    </div>`;
  };
  const frenzyUsable = (): boolean => !ctx.d.noTaps && frenzyReady(ctx.s) && rewardedAvailable();
  const el = openModal({ title: t('Boosts'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const timer = setInterval(() => { if (!busy) body.innerHTML = render(); }, 1000);
  const doSpin = (viaAd: boolean): void => {
    const r = spin(ctx.s, ctx.d, viaAd);
    if (!r) { busy = false; return; }
    ctx.save();
    // Land the chosen slice under the pin, after five full turns.
    const target = (360 - r.slice * 45) % 360;
    rot += 1800 + ((target - (rot % 360) + 360) % 360);
    const disc = body.querySelector<SVGElement>('.wheel-disc');
    body.querySelectorAll<HTMLButtonElement>('[data-spin]').forEach((x) => { x.disabled = true; });
    sfxTap();
    if (disc) {
      disc.classList.add('spinning');
      disc.style.transform = `rotate(${rot}deg)`;
    }
    setTimeout(() => {
      busy = false;
      sfxAchievement();
      haptic('medium');
      if (r.golden || r.slice === 7) noteHappyMoment();
      toast(`<div class="t-ico">${icon('gift')}</div><div><b>${r.golden ? t('Golden Orbit') : t('Lucky Orbit')}</b><br>${esc(prizeText(ctx, r.slice, r.amount, r.golden))}</div>`, 'good');
      if (r.halo) {
        ctx.sky.halo = true;
        toast(`<div class="t-ico">${icon('cosmos')}</div><div><b>${t('Golden Halo earned')}</b><br>${t('{n} days in a row. It now circles your world; turn it off in the Shop.', { n: r.streak })}</div>`, 'good');
      }
      ctx.recalc();
      ctx.dirty();
      if (el.isConnected) body.innerHTML = render();
    }, disc ? 2700 : 0);
  };
  body.addEventListener('click', (e) => {
    const w = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-spin]');
    if (w && !w.disabled && !busy) {
      busy = true;
      if (w.dataset.spin === 'free') doSpin(false);
      else void showRewarded(t('spin the Lucky Orbit')).then((ok) => { if (ok) doSpin(true); else busy = false; });
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-boost]');
    if (!b || b.disabled || busy) return;
    busy = true;
    const kind = b.dataset.boost;
    void showRewarded(kind === 'hyper' ? t('Hyperdrive: double production') : t('Tap Frenzy')).then((ok) => {
      busy = false;
      if (ok && kind === 'hyper') {
        grantHyper(ctx.s);
        toast(`<div class="t-ico">${icon('probe')}</div><div><b>${t('Hyperdrive engaged')}</b><br>${t('Production x2 for {time}', { time: fmtTime(hyperRemainingMs(ctx.s) / 1000) })}</div>`, 'good');
      } else if (ok && kind === 'frenzy') {
        grantFrenzy(ctx.s);
        closeModal(el);
        toast(`<div class="t-ico">${icon('tap')}</div><div><b>${t('Tap Frenzy!')}</b><br>${t('{rate} taps a second, each x{mult}', { rate: AD_CONFIG.frenzyTapsPerSecond, mult: BUFF_MULT.frenzy })}</div>`, 'good');
      }
      if (ok) {
        ctx.recalc();
        ctx.save();
        sfxAchievement();
        haptic('medium');
      }
      if (el.isConnected) body.innerHTML = render();
    });
  });
}

function contractCard(ctx: Ctx): string {
  const { s, d } = ctx;
  const { def, state } = currentContract(s);
  const p = contractProgress(s);
  const top = def.goals[2];
  const ready = contractClaimable(s) > 0;
  const marks = def.goals.map((g, i) => `<i class="tier-mark ${state.claimed > i ? 'got' : p >= g ? 'ready' : ''}" style="left:${(g / top) * 100}%"></i>`).join('');
  const tiers = def.goals.map((g, i) => `<div class="tier ${state.claimed > i ? 'got' : ''}">
      <b>${fmt(g)}</b><span><span class="sd-dot"></span>${fmt(tierReward(d, i))}${i === 2 ? ` + ${t('Medal')}` : ''}</span></div>`).join('');
  const days = contractTimeLeft() / 86400000;
  const left = t('{time} left', { time: days >= 1 ? `${Math.floor(days)}d ${Math.floor((days % 1) * 24)}h` : fmtTime(contractTimeLeft() / 1000) });
  return `<div class="contract">
    <div class="contract-head"><div><div class="contract-kicker">${t('Weekly contract')}</div><div class="contract-name">${esc(t(def.name))}</div></div><div class="dim small">${left}</div></div>
    <p class="contract-goal">${esc(t('{goal} this week. Medal: +{pct} production forever.', { goal: t(def.goalText, { n: fmt(top) }), pct: fmtPercent(MEDAL_PCT) }))}</p>
    <div class="bar contract-bar"><div class="bar-fill" style="width:${Math.min(100, (p / top) * 100)}%"></div>${marks}</div>
    <div class="contract-tiers">${tiers}</div>
    ${ready ? `<button class="btn btn-primary contract-claim" data-contract="1">${t('Claim tier {n}', { n: state.claimed + 1 })}</button>`
      : state.claimed >= 3 ? `<p class="dim small">${t('Contract complete. A new one starts Monday.')}</p>` : `<p class="dim small">${t('Progress: {n} / {goal}', { n: fmt(p), goal: fmt(def.goals[state.claimed]) })}</p>`}
  </div>`;
}

export function openCrystals(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const s = ctx.s;
    const left = Math.max(0, s.crystalNextAt - Date.now());
    const canAd = !s.crystalAdUsed && rewardedAvailable() && left > 0;
    const rows = GENS.map((g, i) => {
      if (!generatorVisible(s, i) && !s.genLevels[i]) return '';
      const lvl = s.genLevels[i] ?? 0;
      const cost = levelCost(s, i);
      return `<div class="lvl-row">
        <div class="lvl-ico">${icon(g.id)}</div>
        <div class="lvl-main"><b>${esc(t(g.name))}</b><span class="dim small">${lvl ? t('Level {n} · +{pct} production', { n: lvl, pct: fmtPercent(lvl * LEVEL_PCT) }) : t('Not levelled yet')}${i === GARDEN_GEN ? ` · ${lvl ? t('Garden open') : t('Level 1 opens the Nebula Garden')}` : ''}${i === FORGE_GEN ? ` · ${lvl ? t('Forge lit') : t('Level 1 lights the Star Forge minigame')}` : ''}</span></div>
        <button class="btn ${s.crystals >= cost ? 'btn-primary' : 'btn-plain'}" data-level="${i}" ${s.crystals >= cost ? '' : 'disabled'}>${icon('crystal')}${cost}</button>
      </div>`;
    }).join('');
    return `<div class="crystal-head">
        <div class="crystal-big">${icon('crystal')}<b>${s.crystals}</b></div>
        <div class="crystal-grow"><div class="dim small">${t('Next crystal in {time}', { time: fmtTime(left / 1000) })}</div>
          <div class="bar"><div class="bar-fill crystal-fill" style="width:${crystalProgress(s) * 100}%"></div></div>
          ${canAd ? `<button class="btn btn-plain btn-small" data-speed="1">${t('Watch ad: {n} hours sooner', { n: AD_SPEEDUP_HOURS })}</button>` : ''}</div>
      </div>
      <p class="dim small">${t('A crystal forms every {n} hours, even while you are away. Each level makes that generator {pct} stronger, forever.', { n: CRYSTAL_HOURS, pct: fmtPercent(LEVEL_PCT) })}</p>
      <div class="lvl-list">${rows}</div>`;
  };
  const el = openModal({ title: t('Quasar Crystals'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => { body.innerHTML = render(); };
  const timer = setInterval(() => { if (!busy) redraw(); }, 1000);
  body.addEventListener('click', (e) => {
    const el2 = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-level],[data-speed]');
    if (!el2 || el2.disabled || busy) return;
    if (el2.dataset.level) {
      const gen = Number(el2.dataset.level);
      if (!levelUp(ctx.s, gen)) return;
      if (gen === GARDEN_GEN && ctx.s.genLevels[gen] === 1) {
        toast(`<div class="t-ico">${icon('sprout')}</div><div><b>${t('Nebula Garden open')}</b><br>${t('Find it at the top of the Build tab.')}</div>`, 'good', 5000);
      }
      if (gen === FORGE_GEN && ctx.s.genLevels[gen] === 1) {
        toast(`<div class="t-ico">${icon('anvil')}</div><div><b>${t('Star Forge lit')}</b><br>${t('Spend its heat from the top of the Build tab.')}</div>`, 'good', 5000);
      }
      sfxAchievement();
      haptic('medium');
      ctx.recalc();
      ctx.save();
      redraw();
      onChange();
      return;
    }
    busy = true;
    void showRewarded(t('grow a crystal sooner')).then((ok) => {
      busy = false;
      if (ok && speedUpCrystal(ctx.s)) {
        ctx.save();
        toast(`<div class="t-ico">${icon('crystal')}</div><div><b>${t('Crystal growth sped up')}</b><br>${t('{n} hours sooner', { n: AD_SPEEDUP_HOURS })}</div>`, 'good');
      }
      redraw();
    });
  });
}

let gardenSeed = 'moss';

export function openGarden(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const { s, d } = ctx;
    const now = Date.now();
    const n = plotCount(s);
    const seeds = SEEDS.map((x) => `<button class="seed${x.id === gardenSeed ? ' on' : ''}" data-seed="${x.id}" aria-pressed="${x.id === gardenSeed}">
        ${icon(x.id)}<b>${esc(t(x.name))}</b><span class="dim small">${fmtTime(x.growMinutes * 60)} · ${fmt(harvestValue(s, d, x))}</span></button>`).join('');
    const plots = Array.from({ length: n }, (_, i) => {
      const p = s.garden[i] ?? null;
      if (!p) return `<button class="plot empty" data-plot="${i}" aria-label="${esc(t('Plant {name}', { name: t(seedById(gardenSeed)!.name) }))}"><span class="plot-plus">+</span></button>`;
      const seed = seedById(p.seed)!;
      const pr = plotProgress(p, now);
      const ready = pr >= 1;
      const left = (1 - pr) * seed.growMinutes * 60;
      return `<button class="plot${ready ? ' ready' : ''}" data-plot="${i}" aria-label="${esc(ready ? t('{name}, ready to harvest', { name: t(seed.name) }) : t(seed.name))}">
        <span class="plot-ico" style="transform:scale(${0.45 + 0.55 * pr})">${icon(seed.id)}</span>
        <span class="plot-time">${ready ? t('Harvest') : fmtTime(left)}</span>
        ${ready ? '' : `<span class="plot-bar"><span style="width:${pr * 100}%"></span></span>`}</button>`;
    }).join('');
    const ready = readyPlots(s, now);
    const canAd = fertilizeReady(s, now) && rewardedAvailable();
    const cool = Math.max(0, s.gardenFertilizeAt - now);
    const lvl = s.genLevels[GARDEN_GEN] ?? 0;
    return `<p class="dim small">${t('Pick a spore, then tap an empty plot. Plants grow in real time, even while you are away.')} ${n < 9 ? t('Nebula Refinery level {lvl}: {n} plots, two more next level.', { lvl, n }) : t('Nebula Refinery level {lvl}: {n} plots.', { lvl, n })}</p>
      <div class="seeds">${seeds}</div>
      <div class="garden-bed">${plots}</div>
      <div class="garden-actions">
        <button class="btn ${ready ? 'btn-primary' : 'btn-plain'}" data-harvest-all="1" ${ready ? '' : 'disabled'}>${ready ? t('Harvest {n} and replant', { n: ready }) : t('Harvest and replant')}</button>
        ${canAd ? `<button class="btn btn-plain" data-fertilize="1">${t('Watch ad: grow {n} hours', { n: FERTILIZE_HOURS })}</button>` : cool > 0 ? `<span class="dim small">${t('Fertilizer again in {time}', { time: fmtTime(cool / 1000) })}</span>` : ''}
      </div>
      <p class="dim small">${t('Harvests: {n}. Fertilizer can be used every {hours} hours.', { n: fmt(s.gardenHarvests), hours: FERTILIZE_COOLDOWN_HOURS })}</p>`;
  };
  const el = openModal({ title: t('Nebula Garden'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => { body.innerHTML = render(); };
  const timer = setInterval(() => { if (!busy) redraw(); }, 1000);
  const paid = (amount: number, what: string): void => {
    sfxAchievement();
    haptic('medium');
    toast(`<div class="t-ico">${icon('sprout')}</div><div><b>${what}</b><br>${t('+{n} Stardust', { n: fmt(amount) })}</div>`, 'good');
    ctx.recalc();
    ctx.save();
    onChange();
  };
  body.addEventListener('click', (e) => {
    const el2 = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-seed],[data-plot],[data-harvest-all],[data-fertilize]');
    if (!el2 || el2.disabled || busy) return;
    const { s, d } = ctx;
    if (el2.dataset.seed) {
      gardenSeed = el2.dataset.seed;
      haptic('light');
    } else if (el2.dataset.plot) {
      const i = Number(el2.dataset.plot);
      const p = s.garden[i];
      if (!p) {
        if (plant(s, i, gardenSeed)) { haptic('light'); ctx.save(); }
      } else if (plotReady(p)) {
        const name = t(seedById(p.seed)!.name);
        const amount = harvest(s, d, i);
        if (amount) paid(amount, esc(t('{name} harvested', { name })));
      } else {
        toast(esc(t('{name} is still growing.', { name: t(seedById(p.seed)!.name) })), 'info');
      }
    } else if (el2.dataset.harvestAll) {
      const n = readyPlots(s);
      const amount = harvestAll(s, d);
      if (amount) paid(amount, n === 1 ? t('1 plant harvested') : t('{n} plants harvested', { n }));
    } else {
      busy = true;
      void showRewarded(t('fertilize the garden')).then((ok) => {
        busy = false;
        if (ok && fertilize(ctx.s)) {
          ctx.save();
          toast(`<div class="t-ico">${icon('sprout')}</div><div><b>${t('Garden fertilized')}</b><br>${t('Every plant grew {n} hours', { n: FERTILIZE_HOURS })}</div>`, 'good');
        }
        redraw();
      });
      return;
    }
    redraw();
  });
}

const EVENT_ICONS = ['siphon', 'nebula', 'forge', 'wormhole'];

function extra(tier: number): string {
  return tier === GOLD_TIER ? t(' and a Contract Medal') : tier === GOLD_TIER + 1 ? t(' and {n} crystals', { n: PLATINUM_CRYSTALS }) : '';
}

export function openEvent(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const { s, d } = ctx;
    const now = Date.now();
    const e = currentEvent(s, now);
    if (!e) return `<p>${t("This weekend's event has ended. The next one opens on Friday.")}</p>`;
    const theme = eventTheme(e.week);
    const nBadges = badgeCount(e);
    const goals = BADGE_GOALS.slice(0, nBadges);
    const top = goals[goals.length - 1];
    // The bar is on a log scale so the early badges are not squashed into the first pixel.
    const pos = (v: number): number => Math.min(100, Math.max(0, (Math.log10(Math.max(1, v)) / Math.log10(top)) * 100));
    const marks = goals.map((g, i) => `<span class="ev-mark${e.claimed > i ? ' got' : ''}" style="left:${pos(g)}%"><i>${t(BADGE_NAMES[i])}</i></span>`).join('');
    const ready = badgeReady(e);
    const next = e.claimed < nBadges ? e.claimed : -1;
    const gens = EVENT_GENS.map((g, i) => {
      const price = eventPrice(e, i);
      const ok = e.flux >= price;
      return `<button class="ev-gen${ok ? ' ok' : ''}" data-egen="${i}" ${ok ? '' : 'aria-disabled="true"'}>
        <span class="ev-gen-ico">${icon(EVENT_ICONS[i])}</span>
        <span class="ev-gen-main"><b>${esc(t(g.name))}</b><span class="dim small">${t('{n} Flux/s each', { n: fmt(g.rate) })}</span></span>
        <span class="ev-gen-side"><span class="ev-price">${fmt(price)}</span><span class="ev-owned">${e.gens[i] ?? 0}</span></span></button>`;
    }).join('');
    const adOk = eventAdReady(e, now) && rewardedAvailable();
    return `<div class="ev-head"><div><div class="contract-kicker">${t('Day {n} of 3 · ends in {time}', { n: eventDay(now), time: fmtTime(eventTimeLeft(now) / 1000) })}</div>
        <div class="ev-name">${esc(t(theme.name))}</div><div class="dim small">${esc(t(theme.flavor))}</div></div></div>
      <div class="ev-core">
        <button class="ev-rift" data-etap="1" aria-label="${t('Tap the rift')}">${icon('rift')}</button>
        <div class="ev-flux"><div class="ev-flux-n">${fmt(e.flux)}</div><div class="dim small">${t('Flux · {rate}/s · {tap} per tap', { rate: fmt(eventRate(e)), tap: fmt(eventTap(e), 1) })}</div>
          ${adOk ? `<button class="btn btn-plain btn-small" data-ead="1">${t('Watch ad: +{n} min of Flux', { n: EVENT_AD_MINUTES })}</button>` : ''}</div>
      </div>
      <div class="bar ev-bar"><div class="bar-fill ev-fill" style="width:${pos(e.earned)}%"></div>${marks}</div>
      ${ready ? `<button class="btn btn-primary btn-wide" data-ebadge="1">${t('Claim {badge} badge: +{n} Stardust', { badge: t(BADGE_NAMES[e.claimed]), n: fmt(badgeReward(d, e.claimed)) })}${extra(e.claimed)}</button>`
        : next >= 0 ? `<p class="dim small">${t('{badge} badge at {goal} Flux earned ({n} so far).', { badge: t(BADGE_NAMES[next]), goal: fmt(BADGE_GOALS[next]), n: fmt(e.earned) })} ${BADGE_MINUTES[next] >= 60 ? t('Pays {n} hours of production', { n: BADGE_MINUTES[next] / 60 }) : t('Pays {n} minutes of production', { n: BADGE_MINUTES[next] })}${extra(next)}.</p>`
        : `<p class="dim small">${t('Every badge won. See you next weekend.')}</p>`}
      ${e.pass ? `<p class="ev-pass-on">${t('Event Pass active: double Flux and the Platinum badge.')}</p>`
        : `<button class="ev-pass" data-epass="1"><b>${t('Event Pass · {price}', { price: esc(productPrice('event_pass')) })}</b><span>${t('Double Flux this weekend and a Platinum badge worth 12 hours of production and {n} crystals.', { n: PLATINUM_CRYSTALS })}</span></button>`}
      <div class="ev-gens">${gens}</div>
      <p class="dim small">${t('Flux keeps flowing while you are away and is wiped when the weekend ends. Badges are paid in Stardust.')}</p>`;
  };
  const el = openModal({ title: t('Weekend Event'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => { body.innerHTML = render(); };
  const timer = setInterval(() => { if (!busy) redraw(); }, 1000);
  body.addEventListener('click', (ev) => {
    const el2 = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-etap],[data-egen],[data-ebadge],[data-ead],[data-epass]');
    if (!el2 || busy) return;
    if (el2.dataset.epass) {
      busy = true;
      void buyProduct(ctx, 'event_pass').then(() => { busy = false; redraw(); onChange(); });
      return;
    }
    const { s, d } = ctx;
    const e = currentEvent(s);
    if (!e) { redraw(); return; }
    if (el2.dataset.etap) {
      eventTapOnce(e);
      sfxTap();
      haptic('light');
    } else if (el2.dataset.egen) {
      if (buyEventGen(e, Number(el2.dataset.egen))) { sfxBuy(); haptic('light'); }
      else sfxDenied();
    } else if (el2.dataset.ebadge) {
      const tier = e.claimed;
      const amount = claimBadge(s, d, e);
      if (!amount) return;
      sfxAchievement();
      haptic('heavy');
      toast(`<div class="t-ico">${icon('rift')}</div><div><b>${t('{badge} badge', { badge: t(BADGE_NAMES[tier]) })}</b><br>${t('+{n} Stardust', { n: fmt(amount) })}${extra(tier)}</div>`, 'good', 5000);
      ctx.recalc();
      ctx.save();
      onChange();
    } else {
      busy = true;
      void showRewarded(t('boost the event')).then((ok) => {
        busy = false;
        const live = currentEvent(ctx.s);
        if (ok && live) {
          const n = eventAdBoost(live);
          if (n) toast(`<div class="t-ico">${icon('rift')}</div><div><b>${t('Rift surge')}</b><br>${t('+{n} Flux', { n: fmt(n) })}</div>`, 'good');
          ctx.save();
        }
        redraw();
      });
      return;
    }
    redraw();
  });
}

function spellDesc(x: { id: string; desc: string }): string {
  return x.id === 'smelt'
    ? t('{n} minutes of production at once. {pct}% of melts fail.', { n: SMELT_MINUTES, pct: SMELT_FAIL * 100 })
    : t(x.desc);
}

export function openForge(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const s = ctx.s;
    const now = Date.now();
    const heat = syncHeat(s, now);
    const max = maxHeat(s);
    const full = heatFullIn(s);
    const spells = SPELLS.map((x) => {
      const ok = heat >= x.cost;
      return `<button class="spell${ok ? ' ok' : ''}" data-spell="${x.id}" ${ok ? '' : 'disabled'}>
        <b>${esc(t(x.name))}</b><span class="spell-cost">${t('{n} heat', { n: x.cost })}</span><span class="dim">${esc(spellDesc(x))}</span></button>`;
    }).join('');
    const canAd = stokeReady(s, now) && rewardedAvailable();
    const cool = Math.max(0, s.forgeAdAt - now);
    return `<div class="heat-head">${icon('anvil')}<div class="heat-main">
        <div class="heat-n">${t('{n} / {max} heat', { n: Math.floor(heat), max })}</div>
        <div class="bar"><div class="bar-fill heat-fill" style="width:${max ? (heat / max) * 100 : 0}%"></div></div>
        <div class="dim small">${full > 0 ? t('Full in {time}', { time: fmtTime(full / 1000) }) : t('The forge is white hot.')}</div></div></div>
      <div class="spells">${spells}</div>
      ${canAd ? `<button class="btn btn-plain btn-wide" data-stoke="1">${t('Watch ad: refill the forge')}</button>` : cool > 0 ? `<p class="dim small">${t('Stoke again in {time}.', { time: fmtTime(cool / 1000) })}</p>` : ''}
      <p class="dim small">${t('Heat refills from empty in {hours} hours, even while you are away. Star Forge level {lvl}: each level adds 10 heat. Forgings used: {n}. Stoking is once every {cool} hours.', { hours: REFILL_MINUTES / 60, lvl: s.genLevels[FORGE_GEN] ?? 0, n: fmt(s.forgeCasts), cool: STOKE_COOLDOWN_HOURS })}</p>`;
  };
  const el = openModal({ title: t('Star Forge'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => { body.innerHTML = render(); };
  const timer = setInterval(() => { if (!busy) redraw(); }, 1000);
  body.addEventListener('click', (e) => {
    const el2 = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-spell],[data-stoke]');
    if (!el2 || el2.disabled || busy) return;
    if (el2.dataset.spell) {
      const spell = spellById(el2.dataset.spell)!;
      const r = cast(ctx.s, ctx.d, spell.id);
      if (!r.ok) { sfxDenied(); return; }
      haptic('medium');
      if (r.failed) {
        sfxDenied();
        toast(`<div class="t-ico">${icon('anvil')}</div><div><b>${t('The melt cracked')}</b><br>${t('The heat is gone. Better luck next pour.')}</div>`, 'info');
      } else {
        sfxAchievement();
        const detail = r.amount ? t('+{n} Stardust', { n: fmt(r.amount) }) : esc(spellDesc(spell));
        toast(`<div class="t-ico">${icon('anvil')}</div><div><b>${esc(t(spell.name))}</b><br>${detail}</div>`, 'good');
      }
      ctx.recalc();
      ctx.dirty();
      ctx.save();
      onChange();
      // Buffs and comets happen on the sky, so get out of the way.
      if (spell.id !== 'smelt') { closeModal(el); return; }
    } else {
      busy = true;
      void showRewarded(t('stoke the forge')).then((ok) => {
        busy = false;
        if (ok && stoke(ctx.s)) {
          ctx.save();
          toast(`<div class="t-ico">${icon('anvil')}</div><div><b>${t('Forge stoked')}</b><br>${t('Heat is full again')}</div>`, 'good');
        }
        redraw();
        onChange();
      });
      return;
    }
    redraw();
  });
}

function sparkline(g: GoodState, rest: number): string {
  const pts = g.hist.length > 1 ? g.hist : [g.price, g.price];
  const lo = Math.min(rest, ...pts);
  const hi = Math.max(rest, ...pts);
  const span = hi - lo || 1;
  const y = (v: number): string => (28 - ((v - lo) / span) * 26).toFixed(1);
  const step = 100 / (pts.length - 1);
  const line = pts.map((v, i) => `${(i * step).toFixed(1)},${y(v)}`).join(' ');
  const up = pts[pts.length - 1] >= pts[0];
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" x2="100" y1="${y(rest)}" y2="${y(rest)}" class="spark-rest"/>
    <polyline points="${line}" class="spark-line ${up ? 'up' : 'down'}"/></svg>`;
}

export function openMarket(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const { s, d } = ctx;
    const now = Date.now();
    const m = syncMarket(s, now)!;
    const unit = creditValue(d);
    const hold = holdSize(s);
    const rows = GOODS.map((def, i) => {
      const g = m.goods[i];
      const prev = g.hist.length > 1 ? g.hist[g.hist.length - 2] : g.price;
      const move = g.price - prev;
      const pl = g.held ? (g.price - g.avg) * g.held : 0;
      const canBuy = maxBuy(s, d, m, i);
      const tip = m.tip === i && m.tipTicks > 0;
      return `<div class="good${tip ? ' tipped' : ''}">
        <div class="good-top">
          <div class="good-name"><b>${esc(t(def.name))}</b>${tip ? `<span class="good-tip">${t('Tip')}</span>` : ''}<span class="dim small">${t('rests at {n}', { n: def.rest })}</span></div>
          <div class="good-price ${move >= 0 ? 'up' : 'down'}">${fmtDec(g.price)}<span>${move >= 0 ? '▲' : '▼'} ${fmtDec(Math.abs(move))}</span></div>
        </div>
        ${sparkline(g, def.rest)}
        <div class="good-foot">
          <span class="good-held">${g.held} / ${hold}${g.held ? ` · ${t('paid {n}', { n: fmtDec(g.avg) })}` : ''}${g.held ? ` · <b class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${fmt(pl)}</b>` : ''}</span>
          <span class="good-btns">
            <button class="chip" data-buy="${i}" data-n="10" ${canBuy ? '' : 'disabled'}>+10</button>
            <button class="chip" data-buy="${i}" data-n="max" ${canBuy ? '' : 'disabled'}>${t('Max')}</button>
            <button class="chip" data-sell="${i}" ${g.held ? '' : 'disabled'}>${t('Sell')}</button>
          </span>
        </div>
      </div>`;
    }).join('');
    const canAd = tipReady(m, now) && rewardedAvailable();
    const cool = Math.max(0, m.tipAt - now);
    return `<div class="market-head">${icon('exchange')}<div>
        <div class="market-tick">${t('Prices move in {time}', { time: fmtTime(nextTickIn(m, now) / 1000) })}</div>
        <div class="dim small">${t('1 credit = 1 second of production ({n} Stardust)', { n: fmt(unit) })}</div></div></div>
      <div class="goods">${rows}</div>
      ${canAd ? `<button class="btn btn-plain btn-wide" data-tip="1">${t('Watch ad: get an insider tip')}</button>` : cool > 0 ? `<p class="dim small">${t('Next tip in {time}.', { time: fmtTime(cool / 1000) })}</p>` : ''}
      <p class="dim small">${t('Prices drift every {tick} minutes, even while you are away, and pull back toward their resting price. Warp Gate level {lvl}: holds {hold} of each good (25 more per level). A tip lifts the cheapest good for {tip} minutes, once every {cool} hours. Goods are priced from your production, so sell before you collapse. Profit so far: {n} credits.', { tick: TICK_MINUTES, lvl: s.genLevels[MARKET_GEN] ?? 0, hold, tip: TIP_TICKS * TICK_MINUTES, cool: TIP_COOLDOWN_HOURS, n: fmt(s.marketProfit) })}</p>`;
  };
  const el = openModal({ title: t('Warp Exchange'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => { body.innerHTML = render(); };
  const timer = setInterval(() => { if (!busy) redraw(); }, 1000);
  body.addEventListener('click', (e) => {
    const el2 = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-buy],[data-sell],[data-tip]');
    if (!el2 || el2.disabled || busy) return;
    const { s, d } = ctx;
    if (el2.dataset.buy) {
      const n = el2.dataset.n === 'max' ? Infinity : Number(el2.dataset.n);
      if (!buyGood(s, d, Number(el2.dataset.buy), n)) { sfxDenied(); return; }
      sfxBuy();
      haptic('light');
    } else if (el2.dataset.sell) {
      const i = Number(el2.dataset.sell);
      const r = sellGood(s, d, i, Infinity);
      if (!r.sold) return;
      if (r.profit > 0) sfxAchievement(); else sfxTap();
      const vars = { n: fmt(r.value), c: fmt(Math.abs(r.profit)) };
      const line = r.profit >= 0 ? t('+{n} Stardust, {c} credit profit', vars) : t('+{n} Stardust, {c} credit loss', vars);
      toast(`<div class="t-ico">${icon('exchange')}</div><div><b>${esc(t('Sold {n} {good}', { n: r.sold, good: t(GOODS[i].name) }))}</b><br>${line}</div>`, r.profit > 0 ? 'good' : 'info');
    } else {
      busy = true;
      void showRewarded(t('get a market tip')).then((ok) => {
        busy = false;
        if (ok) {
          const i = insiderTip(ctx.s);
          if (i >= 0) toast(`<div class="t-ico">${icon('exchange')}</div><div><b>${t('Insider tip')}</b><br>${esc(t('{good} is about to rise', { good: t(GOODS[i].name) }))}</div>`, 'good');
          ctx.save();
        }
        redraw();
      });
      return;
    }
    ctx.recalc();
    ctx.dirty();
    ctx.save();
    onChange();
    redraw();
  });
}

function passCard(ctx: Ctx): string {
  const s = ctx.s;
  const p = currentPass(s);
  const xp = passXp(s, p);
  const tier = passTier(s, p);
  const into = tier >= PASS_TIERS ? XP_PER_TIER : xp - tier * XP_PER_TIER;
  const ready = passClaimable(s);
  return `<button class="pass-card" data-pass="1">
    <div class="pass-card-head"><span class="contract-kicker">${t('Star Pass · Season {n}', { n: seasonLabel() })}${p.premium ? ` · ${t('Premium')}` : ''}</span><span class="dim small">${t('{time} left', { time: fmtTime(seasonTimeLeft() / 1000) })}</span></div>
    <div class="pass-card-main"><b>${t('Tier {n} of {total}', { n: tier, total: PASS_TIERS })}</b>${ready ? `<span class="pass-ready">${ready === 1 ? t('1 reward ready') : t('{n} rewards ready', { n: ready })}</span>` : `<span class="dim small">${t('Open')}</span>`}</div>
    <div class="bar"><div class="bar-fill pass-fill" style="width:${(into / XP_PER_TIER) * 100}%"></div></div>
  </button>`;
}

function rewardText(r: PassReward): string {
  const bits = [`${r.minutes} min`];
  if (r.crystals) bits.push(`${icon('crystal')}${r.crystals}`);
  if (r.medal) bits.push(t('Medal'));
  if (r.skin) bits.push(t('Aurora skin'));
  return bits.join(' · ');
}

export function openPass(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const s = ctx.s;
    const p = currentPass(s);
    const xp = passXp(s, p);
    const tier = passTier(s, p);
    const ready = passClaimable(s);
    const rows = Array.from({ length: PASS_TIERS }, (_, i) => {
      const n = i + 1;
      const reached = tier >= n;
      const cell = (premium: boolean): string => {
        const claimed = premium ? p.prem >= n : p.free >= n;
        const locked = premium && !p.premium;
        const cls = claimed ? 'got' : reached && !locked ? 'ready' : locked ? 'locked' : '';
        return `<div class="pass-cell ${cls}">${locked ? icon('lock') : ''}<span>${rewardText(passReward(n, premium))}</span></div>`;
      };
      return `<div class="pass-row${reached ? ' reached' : ''}"><div class="pass-tier">${n}</div>${cell(false)}${cell(true)}</div>`;
    }).join('');
    const ways = ([
      ['Mission', XP_RATES.missions], ['Daily drop', XP_RATES.dailies], ['Contract tier', XP_RATES.contractTiers],
      ['Event badge', XP_RATES.badges], ['Collapse', XP_RATES.collapses], ['Comet', XP_RATES.comets],
      ['Forging', XP_RATES.casts], ['Profitable sale', XP_RATES.trades], ['Harvest', XP_RATES.harvests],
    ] as Array<[string, number]>).map(([n, x]) => `<span>${t(n)} <b>+${x}</b></span>`).join('');
    return `<div class="pass-top"><div><div class="contract-kicker">${t('Season ends in {time}', { time: fmtTime(seasonTimeLeft() / 1000) })}</div>
        <div class="ev-name">${t('Tier {n} of {total}', { n: tier, total: PASS_TIERS })}</div><div class="dim small">${t('{xp} XP · {per} XP per tier', { xp: fmt(xp), per: XP_PER_TIER })}</div></div></div>
      <div class="pass-ways">${ways}</div>
      ${ready ? `<button class="btn btn-primary btn-wide" data-pclaim="1">${ready === 1 ? t('Claim 1 reward') : t('Claim {n} rewards', { n: ready })}</button>` : ''}
      ${p.premium ? '' : `<button class="ev-pass" data-pbuy="1"><b>${t('Unlock Premium · {price}', { price: esc(productPrice('star_pass')) })}</b><span>${t('A second track: double Stardust, 20 crystals, 2 Contract Medals and the Aurora skin. Tiers you already reached pay out at once.')}</span></button>`}
      <div class="pass-grid"><div class="pass-row pass-headrow"><div class="pass-tier">${t('Tier')}</div><div>${t('Free')}</div><div>${t('Premium')}</div></div>${rows}</div>`;
  };
  const el = openModal({ title: t('Star Pass'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => {
    const top = body.scrollTop;
    body.innerHTML = render();
    body.scrollTop = top;
  };
  const timer = setInterval(() => { if (!busy) redraw(); }, 2000);
  body.addEventListener('click', (e) => {
    const el2 = (e.target as HTMLElement).closest<HTMLElement>('[data-pclaim],[data-pbuy]');
    if (!el2 || busy) return;
    if (el2.dataset.pbuy) {
      busy = true;
      void buyProduct(ctx, 'star_pass').then(() => { busy = false; redraw(); onChange(); });
      return;
    }
    const r = claimPass(ctx.s, ctx.d);
    if (!r.tiers) return;
    if (r.skin) ctx.sky.setSkin(ctx.s.skin);
    sfxAchievement();
    haptic('heavy');
    const bits = [t('+{n} Stardust', { n: fmt(r.stardust) })];
    if (r.crystals) bits.push(t('+{n} crystals', { n: r.crystals }));
    if (r.medals) bits.push(r.medals === 1 ? t('+1 Contract Medal') : t('+{n} Contract Medals', { n: r.medals }));
    if (r.skin) bits.push(t('Aurora skin unlocked'));
    toast(`<div class="t-ico">${icon('trophy')}</div><div><b>${r.tiers === 1 ? t('1 pass reward') : t('{n} pass rewards', { n: r.tiers })}</b><br>${bits.join(' · ')}</div>`, 'good', 6000);
    ctx.recalc();
    ctx.dirty();
    ctx.save();
    onChange();
    redraw();
  });
}

function missionText(m: Mission): string {
  switch (m.kind) {
    case 'own': {
      const gen = m.gen ?? 0;
      return m.target === 1 ? t('Build your first {gen}', { gen: t(GENERATORS[gen].name) }) : t('Own {n} {plural}', { n: m.target, plural: t(pluralName(gen)) });
    }
    case 'taps': return t('Tap {n} times', { n: m.target });
    case 'comets': return m.target === 1 ? t('Catch a comet') : t('Catch {n} comets', { n: m.target });
    case 'earn': return t('Harvest {n} Stardust', { n: fmt(m.target) });
  }
}

export function openMissions(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const { s, d } = ctx;
    const rows = s.missions.map((m, i) => {
      const done = missionDone(s, m);
      const prog = missionProgress(s, m);
      const pct = Math.min(100, (prog / m.target) * 100);
      const progText = `${fmt(prog)} / ${fmt(m.target)}`;
      return `<div class="mission ${done ? 'done' : ''}">
        <div class="mission-main">
          <div class="mission-name">${esc(missionText(m))}</div>
          <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="mission-meta"><span>${progText}</span><span class="mission-reward"><span class="sd-dot"></span>${fmt(missionReward(d, m))}</span></div>
        </div>
        ${done ? `<button class="btn btn-primary" data-claim="${i}">${t('Claim')}</button>`
          : rewardedAvailable() ? `<button class="btn btn-plain mission-swap" data-swap="${i}" aria-label="${t('Watch an ad to swap this mission')}">${t('Swap')}<small>${t('ad')}</small></button>` : ''}
      </div>`;
    }).join('');
    return `${passCard(ctx)}${contractCard(ctx)}
      <h3 class="section-title">${t('Missions')}</h3>
      <div class="missions">${rows}</div>
      <p class="dim small">${t('Missions completed: {n}', { n: fmt(s.missionsDone) })}</p>`;
  };
  const el = openModal({ title: t('Goals'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => { body.innerHTML = render(); };
  const timer = setInterval(() => { if (!busy) redraw(); }, 1000);
  body.addEventListener('click', (e) => {
    const el2 = (e.target as HTMLElement).closest<HTMLElement>('[data-claim],[data-swap],[data-contract],[data-pass]');
    if (!el2 || busy) return;
    if (el2.dataset.pass) {
      openPass(ctx, () => { redraw(); onChange(); });
      return;
    }
    if (el2.dataset.contract) {
      const r = claimContract(ctx.s, ctx.d);
      if (!r) return;
      sfxAchievement();
      haptic(r.medal ? 'heavy' : 'medium');
      ctx.sky.floatCenter(`+${fmt(r.amount)}`, '#ffcf5a', 30);
      if (r.medal) ctx.recalc();
      toast(`<div class="t-ico">${icon('trophy')}</div><div><b>${r.medal ? t('Contract Medal won!') : t('Contract tier {n} reached', { n: r.tier + 1 })}</b><br>${t('+{n} Stardust', { n: fmt(r.amount) })}${r.medal ? ` · ${t('+{pct} production forever', { pct: fmtPercent(MEDAL_PCT) })}` : ''}</div>`, 'trophy', 4500);
      ctx.save();
      redraw();
      onChange();
      return;
    }
    if (el2.dataset.claim) {
      const amount = claimMission(ctx.s, ctx.d, Number(el2.dataset.claim));
      if (amount <= 0) return;
      sfxAchievement();
      haptic('medium');
      ctx.sky.floatCenter(`+${fmt(amount)}`, '#ffcf5a', 28);
      toast(`<div class="t-ico">${icon('mission')}</div><div><b>${t('Mission complete')}</b><br>${t('+{n} Stardust', { n: fmt(amount) })}</div>`, 'good');
      ctx.save();
      redraw();
      onChange();
    } else if (el2.dataset.swap) {
      busy = true;
      const i = Number(el2.dataset.swap);
      void showRewarded(t('swap a mission')).then((ok) => {
        busy = false;
        if (ok) {
          swapMission(ctx.s, ctx.d, i);
          ctx.s.adsWatched++;
          ctx.save();
          onChange();
        }
        redraw();
      });
    }
  });
}

export function openDaily(ctx: Ctx, onClaim: () => void): void {
  const { s, d } = ctx;
  const day = nextStreakDay(s);
  const cells = [1, 2, 3, 4, 5, 6, 7].map((n) => `
    <div class="day ${n < day ? 'done' : n === day ? 'today' : ''}">
      <div class="day-n">${t('Day {n}', { n })}</div>${icon(n === 7 ? 'gift' : 'comet')}<div class="day-r">${rewardMinutes(n) >= 60 ? rewardMinutes(n) / 60 + 'h' : rewardMinutes(n) + 'm'}</div>
    </div>`).join('');
  openModal({
    title: t('Daily supply drop'),
    body: `<p class="dim">${t('Come back every day to keep your streak. Each reward is worth minutes of production.')}</p>
      <div class="days">${cells}</div>
      <p class="daily-amount">${t('Today: {amount} Stardust', { amount: `<span class="sd-dot"></span><b>${fmt(dailyReward(s, d, day))}</b>` })}</p>`,
    buttons: [
      { label: t('Claim'), kind: rewardedAvailable() ? 'plain' : 'primary', onClick: () => claim(1) },
      ...(rewardedAvailable() ? [{
        label: t('Watch ad: x2'), kind: 'primary' as const, onClick: () => {
          void showRewarded(t('double today\'s supply drop')).then((ok) => {
            if (!ok) return;
            ctx.s.adsWatched++;
            claim(2);
          });
        },
      }] : []),
    ],
  });

  function claim(mult: number): void {
    const r = claimDaily(ctx.s, ctx.d);
    if (!r) return;
    if (mult > 1) earn(ctx.s, r.amount * (mult - 1));
    const total = r.amount * mult;
    sfxAchievement();
    haptic('medium');
    ctx.sky.floatCenter(`+${fmt(total)}`, '#ffcf5a', 30);
    toast(`<div class="t-ico">${icon('gift')}</div><div><b>${t('Day {n} claimed', { n: r.day })}${mult > 1 ? ' x2' : ''}</b><br>${t('+{n} Stardust', { n: fmt(total) })} · ${t('streak {n}', { n: r.streak })}</div>`, 'good');
    ctx.save();
    onClaim();
  }
}

export function fmtBuffPct(mult: number): string {
  return fmtPercent(mult - 1);
}
