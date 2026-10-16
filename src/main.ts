// Entry point: builds the screen, loads the save and runs the game loop.

import { ACHIEVEMENT_BY_ID } from './data/achievements.js';
import { availableNews } from './data/news.js';
import { checkAchievements, grantAchievement } from './core/achievements.js';
import { checkAnomaly } from './core/anomalies.js';
import { ANOMALY_BY_ID } from './data/anomalies.js';
import { catchComet, cometDue, cometStaySeconds, rollBlack, scheduleNextComet } from './core/comets.js';
import { dailyReady } from './core/daily.js';
import { freeSpinReady } from './core/wheel.js';
import { availableUpgrades, computeDerived, tap, tick, upgradePrice, type Derived } from './core/economy.js';
import { fmt, fmtRate, fmtTime } from './core/format.js';
import { canCollapse } from './core/prestige.js';
import { applyOffline, BACKUP_EVERY_MS, BACKUP_KEY, deserialize, pickSave, repairNumbers, SAVE_KEY, serialize } from './core/save.js';
import { newState, type GameState } from './core/state.js';
import { resumeAudio, sfxAchievement, sfxComet, sfxTap, suspendAudio, unlockAudio } from './ui/audio.js';
import { BuildPanel } from './ui/build.js';
import type { BuyAmount, Ctx, Panel } from './ui/ctx.js';
import { $, closeModal, esc, modalOpen, setText, toast, toggleClass, topModalDismissable } from './ui/dom.js';
import { icon, installIcons } from './ui/icons.js';
import { VERSION, applySettings, openDaily, openEvent, openHyperdrive, openMissions, openSettings, openStats, showOffline } from './ui/menus.js';
import { claimableMissions, ensureMissions } from './core/missions.js';
import { contractClaimable } from './core/contracts.js';
import { autoBuyStep } from './core/autobuy.js';
import { growCrystals } from './core/crystals.js';
import { badgeReady, currentEvent, eventTimeLeft } from './core/event.js';
import { planReminders } from './core/notify.js';
import { clearReminders, scheduleReminders } from './ui/notify.js';
import { initAds, setBanner } from './ui/ads.js';
import { initStore, maybeOfferStarter, openShop } from './ui/store.js';
import { fillVault } from './core/shop.js';
import { passClaimable } from './core/pass.js';
import { hyperRemainingMs } from './core/ads.js';
import { AD_CONFIG } from './data/ads.js';
import { CosmosPanel, cosmosUnlocked, ProbesPanel, TrophiesPanel, UpgradesPanel } from './ui/panels.js';
import { haptic, hideSplash, isNative, nativeSaveRead, nativeSaveWrite, onBackButton, onPause } from './ui/platform.js';
import { Sky, STAGES, stageFor } from './ui/sky.js';
import { errorReport, installErrorHandlers, recordError } from './ui/errors.js';
import { maybeAskRating } from './ui/rating.js';
import { setLanguage, t, tDesc, tName } from './i18n/index.js';

const TABS = [
  { id: 'build', label: 'Build', icon: 'build' },
  { id: 'upgrades', label: 'Upgrades', icon: 'upgrade' },
  { id: 'trophies', label: 'Trophies', icon: 'trophy' },
  { id: 'cosmos', label: 'Cosmos', icon: 'cosmos' },
  { id: 'probes', label: 'Probes', icon: 'probe' },
];

function layout(): void {
  $('#app').innerHTML = `
    <header class="top">
      <div class="bank">
        <div class="amount-row"><span class="sd-dot big"></span><span class="amount" id="amount">0</span></div>
        <div class="rate" id="rate">${t('{n} per second', { n: 0 })}</div>
      </div>
      <button class="icon-btn shop-btn" id="btn-shop" aria-label="${t('Shop')}">${icon('cart')}</button>
      <button class="icon-btn" id="btn-stats" aria-label="${t('Stats')}">${icon('chart')}</button>
      <button class="icon-btn" id="btn-settings" aria-label="${t('Settings')}">${icon('gear')}</button>
    </header>
    <section class="sky-wrap">
      <canvas id="sky" role="button" tabindex="0" aria-label="${t('Celestial body. Tap to harvest Stardust.')}"></canvas>
      <div class="stage-label" id="stage-label"></div>
      <div class="toasts" id="toasts" aria-live="polite"></div>
      <div class="buffs" id="buffs"></div>
      <button class="gift-btn" id="btn-daily" hidden aria-label="${t('Daily reward')}">${icon('gift')}</button>
      <button class="event-btn" id="btn-event" hidden aria-label="${t('Weekend event')}">${icon('rift')}<span class="event-text" id="event-text">${t('Event')}</span></button>
      <button class="mission-btn" id="btn-missions" hidden aria-label="${t('Missions')}">${icon('mission')}<i class="mission-count" id="mission-count" hidden></i></button>
      <button class="hyper-btn" id="btn-hyper" hidden aria-label="${t('Hyperdrive')}"><span class="hyper-ico">${icon('probe')}</span><span class="hyper-text" id="hyper-text">x2</span></button>
      <div class="tap-info" id="tap-info"></div>
      <div class="hint" id="hint" hidden></div>
      <div class="ticker" aria-hidden="true"><div class="ticker-text" id="ticker"></div></div>
    </section>
    <section class="panel">
      <div class="tab-bodies">
        ${TABS.map((tab) => `<div class="tab-body" id="tab-${tab.id}" hidden></div>`).join('')}
      </div>
      <nav class="tabs" role="tablist">
        ${TABS.map((tab) => `<button class="tab" role="tab" data-tab="${tab.id}">${icon(tab.icon)}<span>${t(tab.label)}</span><i class="badge" hidden></i></button>`).join('')}
      </nav>
    </section>
    <div id="modals"></div>`;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadState(): GameState {
  const main = readStorage(SAVE_KEY);
  const picked = pickSave(main, readStorage(BACKUP_KEY));
  if (picked?.from === 'backup' && main) {
    // Keep the unreadable save around rather than overwriting it.
    try {
      localStorage.setItem(SAVE_KEY + '-broken-' + Date.now(), main);
    } catch {
      /* storage full or unavailable */
    }
    console.warn('Main save unreadable; loaded the backup');
  }
  return picked?.state ?? newState();
}

function start(): void {
  const state = loadState();
  setLanguage(state.settings.lang);
  installIcons();
  layout();
  let lastBackupAt = 0;
  // On Android, wait until the preferences copy has been checked before
  // writing over it, in case localStorage was cleared and this is a fresh state.
  let nativeChecked = !isNative() || !!readStorage(SAVE_KEY);
  let derived: Derived = computeDerived(state);
  let rebuildAll = true;
  let activeTab = 'build';
  const panels: Record<string, Panel> = {};

  const sky = new Sky($('#sky') as HTMLCanvasElement, {
    onTap: (x, y) => {
      if (ctx.d.noTaps) {
        if (Math.random() < 0.2) sky.floatText(x, y, t('Hands tied!'), '#ff5f7a', 18);
        return null;
      }
      const amount = tap(ctx.s, ctx.d);
      sfxTap();
      haptic('light');
      return '+' + fmt(amount, 1);
    },
    onComet: (black) => {
      const r = catchComet(ctx.s, ctx.d, black);
      ctx.recalc();
      sfxComet();
      haptic('heavy');
      sky.floatCenter(r.title, black ? '#c58bff' : '#bff6ff', 28);
      if (r.amount > 0) sky.floatCenter('+' + fmt(r.amount), '#ffcf5a', 26);
      toast(`<div class="t-ico">${icon(black ? 'blackComet' : 'comet')}</div><div><b>${esc(r.title)}</b><br>${esc(r.amount > 0 ? `+${fmt(r.amount)} Stardust` : r.detail)}</div>`, r.kind === 'well' ? 'bad' : 'comet');
    },
    onCometMissed: () => undefined,
  });

  const ctx: Ctx = {
    s: state,
    d: derived,
    sky,
    buyAmount: 1 as BuyAmount,
    recalc() {
      derived = computeDerived(ctx.s);
      ctx.d = derived;
    },
    save() {
      const now = Date.now();
      ctx.s.lastSeen = now;
      const fixed = repairNumbers(ctx.s, now);
      if (fixed.length) {
        console.warn('Repaired save fields', fixed);
        ctx.recalc();
      }
      const text = serialize(ctx.s);
      try {
        localStorage.setItem(SAVE_KEY, text);
        if (now - lastBackupAt >= BACKUP_EVERY_MS) {
          localStorage.setItem(BACKUP_KEY, text);
          lastBackupAt = now;
        }
      } catch (e) {
        console.warn('Save failed', e);
      }
      if (nativeChecked) nativeSaveWrite(SAVE_KEY, text);
    },
    replaceState(s: GameState) {
      ctx.s = s;
      ctx.recalc();
      applySettings(ctx);
      sky.setStage(stageFor(s.earnedRun));
      sky.setSkin(s.skin);
      ctx.save();
      ctx.dirty();
      ctx.showTab('build');
    },
    dirty() {
      rebuildAll = true;
    },
    showTab(id: string) {
      activeTab = id;
      document.querySelectorAll<HTMLElement>('.tab').forEach((b) => toggleClass(b, 'on', b.dataset.tab === id));
      document.querySelectorAll<HTMLElement>('.tab-body').forEach((b) => (b.hidden = b.id !== `tab-${id}`));
      $(`#tab-${id}`).scrollTop = 0;
      panels[id]?.refresh(ctx);
    },
  };

  panels.build = new BuildPanel($('#tab-build'), ctx);
  panels.upgrades = new UpgradesPanel($('#tab-upgrades'), ctx);
  panels.trophies = new TrophiesPanel($('#tab-trophies'), ctx);
  panels.cosmos = new CosmosPanel($('#tab-cosmos'), ctx);
  panels.probes = new ProbesPanel($('#tab-probes'), ctx);

  applySettings(ctx);
  sky.setStage(stageFor(state.earnedRun));
  sky.setSkin(state.skin);
  void initStore(ctx);

  // Offline progress since the last session.
  const off = applyOffline(ctx.s, ctx.d);
  if (off.earned > 0) {
    if (off.seconds >= 3600) grantAchievement(ctx.s, 'offline_hour');
    showOffline(ctx, off.seconds, off.earned);
  }

  document.querySelector('.tabs')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
    if (b) ctx.showTab(b.dataset.tab!);
  });
  $('#btn-shop').addEventListener('click', () => openShop(ctx, () => refreshSlow(true)));
  $('#btn-stats').addEventListener('click', () => openStats(ctx));
  $('#btn-settings').addEventListener('click', () => openSettings(ctx));
  $('#btn-daily').addEventListener('click', () => openDaily(ctx, () => refreshSlow(true)));
  $('#btn-hyper').addEventListener('click', () => openHyperdrive(ctx));
  $('#btn-event').addEventListener('click', () => openEvent(ctx, () => refreshSlow(true)));
  $('#btn-missions').addEventListener('click', () => openMissions(ctx, () => refreshSlow(true)));
  void initAds().then(() => {
    if (AD_CONFIG.banner && !ctx.s.noAds) void setBanner(true);
  });
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  // Block pinch-zoom and double-tap zoom on iOS Safari.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  onBackButton(() => {
    if (modalOpen()) {
      if (topModalDismissable()) closeModal();
      return true;
    }
    if (activeTab !== 'build') {
      ctx.showTab('build');
      return true;
    }
    return false;
  });

  let paused = false;
  onPause(
    () => {
      if (paused) return;
      paused = true;
      ctx.save();
      suspendAudio();
      if (ctx.s.settings.notifications) void scheduleReminders(planReminders(ctx.s, ctx.d));
    },
    () => {
      if (!paused) return;
      paused = false;
      resumeAudio();
      void clearReminders();
      const back = applyOffline(ctx.s, ctx.d);
      if (back.earned > 0 && back.seconds >= 60) {
        if (back.seconds >= 3600) grantAchievement(ctx.s, 'offline_hour');
        showOffline(ctx, back.seconds, back.earned);
      }
      ctx.recalc();
      last = performance.now();
    },
  );

  // ---------------------------------------------------------------- slow UI

  const amountEl = $('#amount');
  const rateEl = $('#rate');
  const buffsEl = $('#buffs');
  const stageEl = $('#stage-label');
  const tapInfo = $('#tap-info');
  const dailyBtn = $('#btn-daily') as HTMLButtonElement;
  const hyperBtn = $('#btn-hyper') as HTMLButtonElement;
  const hyperText = $('#hyper-text');
  const missionBtn = $('#btn-missions') as HTMLButtonElement;
  const missionCount = $('#mission-count');
  const eventBtn = $('#btn-event') as HTMLButtonElement;
  const eventText = $('#event-text');
  let shownAmount = state.stardust;

  function refreshSlow(force = false): void {
    const { s, d } = ctx;
    maybeAskRating(ctx);
    // Achievements.
    const fresh = checkAchievements(s, d.sps);
    if (fresh.length) {
      ctx.recalc();
      sfxAchievement();
      for (const id of fresh.slice(0, 3)) {
        const a = ACHIEVEMENT_BY_ID[id];
        toast(`<div class="t-ico">${icon('trophy')}</div><div><b>${t('Achievement: {name}', { name: esc(tName(a)) })}</b><br>${esc(tDesc(a))}</div>`, 'trophy', 4000);
      }
      if (fresh.length > 3) toast(t('and {n} more achievements!', { n: fresh.length - 3 }), 'trophy');
      rebuildAll = true;
    }

    // Anomaly goal.
    const finished = checkAnomaly(s);
    if (finished) {
      const a = ANOMALY_BY_ID[finished];
      ctx.recalc();
      sfxAchievement();
      haptic('heavy');
      toast(`<div class="t-ico">${icon('darkMatter')}</div><div><b>${t('Anomaly complete: {name}', { name: esc(t(a.name)) })}</b><br>${t('{reward} The rule is lifted.', { reward: esc(t(a.rewardText)) })}</div>`, 'good', 6000);
      rebuildAll = true;
    }

    // Stage of the celestial body.
    const stage = stageFor(s.earnedRun);
    sky.setStage(stage);
    sky.setDrones(s.generators[0]);
    sky.setOwned(s.generators);
    setText(stageEl, s.anomaly ? `${t(STAGES[stage].name)} · ${t(ANOMALY_BY_ID[s.anomaly]?.name ?? '')}` : t(STAGES[stage].name));
    toggleClass(stageEl, 'anomaly', !!s.anomaly);
    setText(tapInfo, d.noTaps ? t('Tapping is disabled') : t('{n} per tap', { n: fmt(d.tap, 1) }));

    // Buff chips.
    const buffHtml = s.buffs.map((b) => {
      const left = Math.max(0, b.endsAt - s.time);
      const label = t({ rush: 'Rush x7', supernova: 'Tap x777', well: 'Well x0.5', horizon: 'Horizon x66', frenzy: 'Frenzy x10' }[b.kind]);
      return `<div class="buff buff-${b.kind}"><span>${label}</span><b>${Math.ceil(left)}s</b><i style="width:${(left / b.duration) * 100}%"></i></div>`;
    }).join('');
    if (buffsEl.innerHTML !== buffHtml) buffsEl.innerHTML = buffHtml;
    const top = s.buffs.find((b) => b.kind === 'well') ?? s.buffs.find((b) => b.kind === 'horizon') ?? s.buffs.find((b) => b.kind === 'rush') ?? s.buffs.find((b) => b.kind === 'supernova' || b.kind === 'frenzy');
    sky.aura = !top ? 'none' : top.kind === 'frenzy' ? 'supernova' : top.kind;

    dailyBtn.hidden = !dailyReady(s) || s.tapsAll < 10;

    // Quasar Crystals grow in real time, including time away.
    const grown = growCrystals(s);
    if (grown > 0) {
      toast(`<div class="t-ico">${icon('crystal')}</div><div><b>${grown > 1 ? t('{n} Quasar Crystals formed', { n: grown }) : t('A Quasar Crystal formed')}</b><br>${t('Spend it on the Build tab to level up a generator.')}</div>`, 'good', 5000);
      rebuildAll = true;
    }

    // Missions start once the first drone is built.
    const missionsOn = s.generators[0] > 0 || s.collapses > 0;
    if (missionsOn) ensureMissions(s, d);
    missionBtn.hidden = !missionsOn;
    // Checking the contract also starts a new week's one as soon as the week turns.
    const contractReady = contractClaimable(s);
    const ready = claimableMissions(s) + (missionsOn ? contractReady + passClaimable(s) : 0);
    missionCount.hidden = ready === 0;
    setText(missionCount, String(ready));
    toggleClass(missionBtn, 'ready', ready > 0);

    // Stardust Vault fills in real time; the starter offer pops up once.
    fillVault(s);
    if (!modalOpen()) maybeOfferStarter(ctx);

    // Weekend event: Friday to Sunday, once the player has a real economy.
    const ev = currentEvent(s);
    eventBtn.hidden = !ev;
    if (ev) {
      const badge = badgeReady(ev);
      toggleClass(eventBtn, 'ready', badge);
      setText(eventText, badge ? t('Badge!') : fmtTime(eventTimeLeft() / 1000));
    }

    // Hyperdrive (rewarded ad) button, offered once the player is hooked.
    const hyperLeft = hyperRemainingMs(s);
    if (d.hyper && hyperLeft <= 0) ctx.recalc();
    hyperBtn.hidden = !AD_CONFIG.enabled || (s.generators[1] === 0 && s.collapses === 0);
    toggleClass(hyperBtn, 'on', hyperLeft > 0);
    toggleClass(hyperBtn, 'spin-ready', freeSpinReady(s));
    setText(hyperText, hyperLeft > 0 ? fmtTime(hyperLeft / 1000) : 'x2');

    // Tabs: Cosmos shows a lock until unlocked, Probes only once bought.
    const probeTab = document.querySelector<HTMLElement>('[data-tab="probes"]')!;
    probeTab.hidden = !d.expeditions;
    toggleClass(document.querySelector('[data-tab="cosmos"]')!, 'locked', !cosmosUnlocked(ctx));
    badge('upgrades', !d.noUpgrades && availableUpgrades(s).some((u) => upgradePrice(d, u) <= s.stardust));
    badge('cosmos', canCollapse(s) && s.collapses === 0);
    badge('probes', s.expeditions.some((e) => e.returnsAt <= Date.now()) || (d.expeditions && s.expeditions.length < d.expeditionSlots));

    if (rebuildAll || force) {
      rebuildAll = false;
      for (const id in panels) panels[id].refresh(ctx);
    } else {
      panels[activeTab]?.refresh(ctx);
    }
    hints();
  }

  function badge(tab: string, on: boolean): void {
    const b = document.querySelector<HTMLElement>(`[data-tab="${tab}"] .badge`);
    if (b) b.hidden = !on;
  }

  // ---------------------------------------------------------------- hints

  const hintEl = $('#hint');
  let hintId = '';
  function showHint(id: string, text: string): void {
    if (hintId === id) return;
    hintId = id;
    hintEl.textContent = text;
    hintEl.hidden = false;
    hintEl.dataset.hint = id;
  }
  function hints(): void {
    const { s } = ctx;
    const seen = s.seenHints;
    toggleClass(document.querySelector('.gen[data-gen="0"]')!, 'pulse', s.generators[0] === 0 && s.stardust >= 15);
    if (s.tapsAll < 5) return showHint('tap', t('Tap the asteroid to harvest Stardust'));
    if (s.generators[0] === 0 && s.stardust >= 15 && !seen.buy) return showHint('buy', t('Buy a Mining Drone below. It mines for you.'));
    if (s.generators[0] > 0) seen.buy = true;
    if (sky.hasComet && !seen.comet) return showHint('comet', t('A comet! Tap it quickly for a boost'));
    if (!sky.hasComet && s.cometsAll > 0) seen.comet = true;
    if (!seen.upgrade && Object.keys(s.upgrades).length === 0 && availableUpgrades(s).some((u) => upgradePrice(ctx.d, u) <= s.stardust)) {
      return showHint('upgrade', t('An upgrade is ready. Tap it in the strip above your generators.'));
    }
    if (Object.keys(s.upgrades).length > 0) seen.upgrade = true;
    if (!seen.cosmos && canCollapse(s)) return showHint('cosmos', t('Dark Matter is ready. Open Cosmos to collapse.'));
    if (s.collapses > 0) seen.cosmos = true;
    if (hintId) {
      hintId = '';
      hintEl.hidden = true;
    }
  }

  // ---------------------------------------------------------------- ticker

  const tickerEl = $('#ticker');
  let lastNews = '';
  function nextNews(): void {
    const list = availableNews(ctx.s);
    let pick = list[Math.floor(Math.random() * list.length)];
    if (pick === lastNews && list.length > 1) pick = list[(list.indexOf(pick) + 1) % list.length];
    lastNews = pick;
    tickerEl.textContent = pick;
    tickerEl.classList.remove('run');
    void tickerEl.offsetWidth;
    tickerEl.classList.add('run');
  }
  tickerEl.addEventListener('animationend', nextNews);
  nextNews();

  // ---------------------------------------------------------------- loop

  let last = performance.now();
  let slowTimer = 0;
  let saveTimer = 0;
  let autoTapAcc = 0;
  let autoBuyAcc = 0;
  let cometPending = false;

  // Slow phones: watch the first 20 s of play and switch on battery saver
  // once if the game runs below about 22 fps.
  const SLOW_FRAME_MS = 45;
  const slowSample: number[] = [];

  // One bad frame must never stop the game: errors are logged for the report
  // in Settings and the loop carries on.
  let frameErrorShown = false;
  function frame(now: number): void {
    try {
      step(now);
    } catch (e) {
      recordError('frame', e);
      if (!frameErrorShown) {
        frameErrorShown = true;
        toast(t('Something went wrong, but your progress is safe. Settings has an error report.'), 'bad', 5000);
      }
    }
    requestAnimationFrame(frame);
  }

  function step(now: number): void {
    const gap = now - last;
    // Battery saver runs the whole loop at about 30 fps.
    if (ctx.s.settings.saver && gap < 30) return;
    const dt = Math.min(1, Math.max(0, gap / 1000));
    last = now;
    if (!paused && !ctx.s.settings.saverAuto && gap > 0 && gap < 1000) {
      slowSample.push(gap);
      if (slowSample.length >= 400 || slowSample.reduce((a, b) => a + b, 0) > 20000) {
        const sorted = slowSample.slice().sort((a, b) => a - b);
        ctx.s.settings.saverAuto = true;
        if (sorted[sorted.length >> 1] > SLOW_FRAME_MS) {
          ctx.s.settings.saver = true;
          applySettings(ctx);
          toast(t('Battery saver is on to keep things smooth. You can change it in Settings.'), 'info', 5000);
        }
        ctx.save();
      }
    }
    if (!paused) {
      const { s } = ctx;
      if (tick(s, ctx.d, dt)) ctx.recalc();

      // Comets.
      if (cometDue(s) && !sky.hasComet) {
        cometPending = !ctx.d.noComets;
        scheduleNextComet(s, ctx.d);
      }
      if (cometPending && !modalOpen()) {
        cometPending = false;
        sky.spawnComet(cometStaySeconds(ctx.d), rollBlack(ctx.d));
      }

      // Probes tapping for you.
      // Auto-Fabricators buying generators.
      if (ctx.d.autoBuy && ctx.s.autoBuyOn) {
        autoBuyAcc += dt;
        if (autoBuyAcc >= 1) {
          autoBuyAcc = 0;
          if (autoBuyStep(ctx.s, ctx.d) > 0) {
            ctx.recalc();
            ctx.dirty();
          }
        }
      }

      if (ctx.d.autoTap > 0) {
        autoTapAcc += ctx.d.autoTap * dt;
        while (autoTapAcc >= 1) {
          autoTapAcc -= 1;
          sky.autoTap();
        }
      }

      // Number counters ease towards the real value.
      shownAmount += (s.stardust - shownAmount) * Math.min(1, dt * 12);
      if (Math.abs(s.stardust - shownAmount) < 1 || s.stardust < shownAmount) shownAmount = s.stardust;
      setText(amountEl, fmt(shownAmount));
      setText(rateEl, t('{n} per second', { n: fmtRate(ctx.d.sps) }));
      toggleClass(rateEl, 'boosted', ctx.d.prodBuff > 1);
      toggleClass(rateEl, 'nerfed', ctx.d.prodBuff < 1);

      slowTimer += dt;
      if (slowTimer >= 0.25) {
        slowTimer = 0;
        refreshSlow();
      }
      saveTimer += dt;
      if (saveTimer >= 10) {
        saveTimer = 0;
        ctx.save();
      }
    }
    sky.frame(dt);
  }

  if (ctx.s.nextCometAt < ctx.s.time) scheduleNextComet(ctx.s, ctx.d);
  ctx.showTab('build');
  refreshSlow(true);
  requestAnimationFrame(frame);
  hideSplash();
  if (!nativeChecked) {
    void nativeSaveRead(SAVE_KEY).then((text) => {
      nativeChecked = true;
      const found = pickSave(text, null);
      if (found && found.state.earnedAll > ctx.s.earnedAll) {
        ctx.replaceState(found.state);
        toast(t('Progress restored from the phone backup.'), 'good');
      }
    });
  }

  // Hooks for automated screenshots and tests.
  (window as unknown as { __game: unknown }).__game = {
    ctx,
    spawnComet: (black = false) => sky.spawnComet(13, black),
    cometPosition: () => sky.cometPosition(),
    fmtTime,
  };
}

installErrorHandlers();
try {
  start();
} catch (e) {
  // Startup failed: show what happened instead of a blank screen. The save is untouched.
  recordError('start', e);
  hideSplash();
  document.body.innerHTML = `<div class="crash"><h2>${t('Stardust Empire could not start')}</h2>
    <p>${t('Your progress is still saved on this phone. Please close the game and open it again. If this keeps happening, copy the report below and send it to the developer.')}</p>
    <textarea class="code" readonly>${esc(errorReport(VERSION))}</textarea></div>`;
}

