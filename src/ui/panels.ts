// The Upgrades, Trophies, Cosmos and Probes tabs.

import { noteHappyMoment } from './rating.js';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { ANOMALIES, ANOMALY_BY_ID } from '../data/anomalies.js';
import { closestAchievements } from '../core/achievements.js';
import { abandonAnomaly, anomaliesUnlocked, enterAnomaly } from '../core/anomalies.js';
import { COSMIC, COSMIC_BY_ID } from '../data/cosmic.js';
import { DESTINATIONS, DESTINATION_BY_ID, RELICS } from '../data/expeditions.js';
import { GENERATORS } from '../data/generators.js';
import { UPGRADES, UPGRADE_BY_ID } from '../data/upgrades.js';
import { affordableUpgradeCount, availableUpgrades, upcomingUpgrades, buyAllUpgrades, buyCosmic, buyUpgrade, cosmicAvailable, upgradePrice } from '../core/economy.js';
import { collectExpeditions, expeditionDurationMs, expeditionReward, freeSlots, relicName, startExpedition } from '../core/expeditions.js';
import { fmt, fmtDec, fmtPercent, fmtTime } from '../core/format.js';
import { creditValue, heldValue } from '../core/market.js';
import { canCollapse, collapse, collapseGain, darkMatterPct, DM_SCALE, earningsForNextDarkMatter, pendingDarkMatter } from '../core/prestige.js';
import { achievementCount, darkMatterAvailable } from '../core/state.js';
import { sfxAchievement, sfxCollapse, sfxDenied, sfxUpgrade } from './audio.js';
import type { Ctx, Panel } from './ctx.js';
import { $, confirmModal, esc, openModal, setHidden, setText, toast, toggleClass } from './dom.js';
import { icon } from './icons.js';
import { haptic } from './platform.js';
import { showInterstitial } from './ads.js';
import { interstitialAllowed } from '../core/ads.js';
import { stageFor, STAGES } from './sky.js';
import { t, tDesc, tName } from '../i18n/index.js';

// ------------------------------------------------------------------ Upgrades

export class UpgradesPanel implements Panel {
  private key = '';
  private list: HTMLElement;
  private owned: HTMLElement;
  private ownedTitle: HTMLElement;
  private buyAll: HTMLButtonElement;
  private next: HTMLElement;
  private nextTitle: HTMLElement;
  private nextKey = '';

  constructor(private root: HTMLElement, ctx: Ctx) {
    root.innerHTML = `
      <div class="upg-head"><h3 class="section-title">${t('Available')}</h3><button class="btn btn-plain upg-all" data-buy-all hidden></button></div>
      <div class="upg-list" id="upg-list"></div>
      <h3 class="section-title" id="upg-next-title" hidden>${t('Coming up')}</h3>
      <div class="upg-list upg-next" id="upg-next"></div>
      <h3 class="section-title" id="upg-owned-title">${t('Bought')}</h3>
      <div class="upg-owned" id="upg-owned"></div>`;
    this.list = $('#upg-list', root);
    this.owned = $('#upg-owned', root);
    this.ownedTitle = $('#upg-owned-title', root);
    this.buyAll = $('[data-buy-all]', root) as HTMLButtonElement;
    this.next = $('#upg-next', root);
    this.nextTitle = $('#upg-next-title', root);
    root.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-buy-all]')) {
        const n = buyAllUpgrades(ctx.s, ctx.d);
        if (n) {
          sfxUpgrade();
          haptic('medium');
          ctx.recalc();
          ctx.dirty();
          toast(esc(t('Bought {n} upgrades', { n })));
        } else sfxDenied();
        return;
      }
      const buy = el.closest<HTMLElement>('[data-buy]');
      if (buy) {
        const u = UPGRADE_BY_ID[buy.dataset.buy!];
        if (buyUpgrade(ctx.s, ctx.d, u.id)) {
          sfxUpgrade();
          haptic('medium');
          ctx.recalc();
          ctx.dirty();
        } else sfxDenied();
        return;
      }
      const own = el.closest<HTMLElement>('[data-owned]');
      if (own) {
        const u = UPGRADE_BY_ID[own.dataset.owned!];
        toast(`<div class="t-ico">${icon(u.icon)}</div><div><b>${esc(tName(u))}</b><br>${esc(tDesc(u))}</div>`);
      }
    });
  }

  refresh(ctx: Ctx): void {
    const { s, d } = ctx;
    const ups = d.noUpgrades ? [] : availableUpgrades(s);
    const key = ups.map((u) => u.id).join(',') + '|' + Object.keys(s.upgrades).length + d.noUpgrades;
    if (key !== this.key) {
      this.key = key;
      this.list.innerHTML = ups.length
        ? ups.map((u) => `
          <div class="upg-card" data-id="${u.id}">
            <div class="upg-ico">${icon(u.icon)}</div>
            <div class="upg-text"><div class="upg-name">${esc(tName(u))}</div><div class="upg-desc">${esc(tDesc(u))}</div></div>
            <button class="btn btn-buy" data-buy="${u.id}" aria-label="${esc(t('Buy {name} for {price} Stardust', { name: tName(u), price: fmt(upgradePrice(d, u)) }))}"><span class="sd-dot"></span>${fmt(upgradePrice(d, u))}</button>
          </div>`).join('')
        : `<p class="empty">${d.noUpgrades ? t('Upgrades cannot be bought in this anomaly.') : t('No upgrades right now. Buy more generators to unlock new ones.')}</p>`;
      const bought = UPGRADES.filter((u) => s.upgrades[u.id]);
      setText(this.ownedTitle, t('Bought ({n} of {total})', { n: bought.length, total: UPGRADES.length }));
      this.owned.innerHTML = bought.map((u) => `<button class="owned-chip" data-owned="${u.id}" aria-label="${esc(tName(u))}">${icon(u.icon)}</button>`).join('');
    }
    this.list.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) => {
      toggleClass(b, 'afford', upgradePrice(d, UPGRADE_BY_ID[b.dataset.buy!]) <= s.stardust);
    });
    const soon = d.noUpgrades ? [] : upcomingUpgrades(s);
    const nextKey = soon.map((u) => `${u.id}:${s.generators[u.need!.gen]}`).join(',');
    if (nextKey !== this.nextKey) {
      this.nextKey = nextKey;
      setHidden(this.nextTitle, !soon.length);
      this.next.innerHTML = soon.map((u) => {
        const { gen, owned } = u.need!;
        const have = s.generators[gen];
        return `
          <div class="upg-card upg-soon">
            <div class="upg-ico">${icon(u.icon)}</div>
            <div class="upg-text"><div class="upg-name">${esc(tName(u))}</div>
              <div class="upg-desc">${esc(t('{gen}: {have} of {need}', { gen: t(GENERATORS[gen].name), have, need: owned }))}</div>
              <div class="gen-tier" aria-hidden="true"><i style="width:${(100 * have) / owned}%"></i></div></div>
          </div>`;
      }).join('');
    }
    const n = affordableUpgradeCount(s, d);
    setHidden(this.buyAll, n < 2);
    if (n >= 2) setText(this.buyAll, t('Buy all ({n})', { n }));
  }
}

// ------------------------------------------------------------------ Trophies

export class TrophiesPanel implements Panel {
  private key = '';
  private grid: HTMLElement;
  private summary: HTMLElement;
  private near: HTMLElement;
  private nearTitle: HTMLElement;
  private nearKey = '';

  constructor(private root: HTMLElement, ctx: Ctx) {
    root.innerHTML = `<div class="trophy-summary" id="trophy-summary"></div>
      <h3 class="section-title" id="trophy-near-title" hidden>${t('Almost there')}</h3>
      <div class="upg-list" id="trophy-near"></div>
      <div class="trophy-grid" id="trophy-grid"></div>`;
    this.grid = $('#trophy-grid', root);
    this.summary = $('#trophy-summary', root);
    this.near = $('#trophy-near', root);
    this.nearTitle = $('#trophy-near-title', root);
    this.grid.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-ach]');
      if (!el) return;
      const a = ACHIEVEMENT_BY_ID[el.dataset.ach!];
      const got = a.id in ctx.s.achievements;
      const name = got || !a.hidden ? tName(a) : '???';
      const desc = got || !a.hidden ? tDesc(a) : t('A secret achievement.');
      toast(`<div class="t-ico">${icon(got ? 'trophy' : 'lock')}</div><div><b>${esc(name)}</b>${got ? ' ✓' : ''}<br>${esc(desc)}</div>`, got ? 'trophy' : 'info');
    });
  }

  refresh(ctx: Ctx): void {
    const s = ctx.s;
    const close = closestAchievements(s, ctx.d ? ctx.d.sps : 0);
    const nearKey = close.map(({ a, p }) => `${a.id}:${Math.floor(p * 100)}`).join(',');
    if (nearKey !== this.nearKey) {
      this.nearKey = nearKey;
      setHidden(this.nearTitle, !close.length);
      this.near.innerHTML = close.map(({ a, p }) => `
        <div class="upg-card upg-soon">
          <div class="upg-ico">${icon('trophy')}</div>
          <div class="upg-text"><div class="upg-name">${esc(tName(a))}</div>
            <div class="upg-desc">${esc(tDesc(a))}</div>
            <div class="gen-tier" role="progressbar" aria-label="${esc(tName(a))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(p * 100)}"><i style="width:${(100 * p).toFixed(1)}%"></i></div></div>
        </div>`).join('');
    }
    const n = achievementCount(s);
    const key = String(n);
    if (key === this.key) return;
    this.key = key;
    const per = ctx.d ? achievementBonus(ctx) : 0.01;
    this.summary.innerHTML = t('<b>{n}</b> of {total} achievements · <span class="good">+{pct}</span> production', { n, total: ACHIEVEMENTS.length, pct: fmtPercent(per * n) });
    this.grid.innerHTML = ACHIEVEMENTS.map((a) => {
      const got = a.id in s.achievements;
      return `<button class="trophy${got ? ' got' : ''}${a.hidden && !got ? ' secret' : ''}" data-ach="${a.id}" aria-label="${esc(got || !a.hidden ? tName(a) : t('Secret'))}">${icon(got ? 'trophy' : 'lock')}</button>`;
    }).join('');
  }
}

function achievementBonus(ctx: Ctx): number {
  return ctx.s.cosmic.map ? 0.015 : 0.01;
}

// ------------------------------------------------------------------ Cosmos

export const COSMOS_UNLOCK = DM_SCALE;

export function cosmosUnlocked(ctx: Ctx): boolean {
  return ctx.s.earnedAll >= COSMOS_UNLOCK || ctx.s.collapses > 0;
}

export class CosmosPanel implements Panel {
  private built = false;
  private treeKey = '';

  constructor(private root: HTMLElement, private ctx: Ctx) {
    root.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('#btn-collapse')) this.askCollapse();
      const node = el.closest<HTMLElement>('[data-cosmic]');
      if (node) this.showCosmic(node.dataset.cosmic!);
      const enter = el.closest<HTMLElement>('[data-anomaly]');
      if (enter) this.askAnomaly(enter.dataset.anomaly!);
      if (el.closest('#btn-abandon')) this.askAbandon();
    });
  }

  private build(): void {
    this.built = true;
    this.root.innerHTML = `
      <div class="dm-card">
        <div class="dm-ico">${icon('darkMatter')}</div>
        <div><div class="dm-amount" id="dm-amount"></div><div class="dm-sub" id="dm-sub"></div></div>
      </div>
      <div class="collapse-card">
        <div class="collapse-row"><span>${t('Collapse now for')}</span><b id="dm-pending"></b></div>
        <div class="collapse-gain" id="dm-gain"></div>
        <div class="bar"><div class="bar-fill" id="dm-bar"></div></div>
        <div class="collapse-note" id="dm-next"></div>
        <button class="btn btn-cosmic btn-wide" id="btn-collapse">${t('Collapse the Universe')}</button>
      </div>
      <div id="anomalies"></div>
      <h3 class="section-title">${t('Cosmic upgrades')}</h3>
      <p class="hint-text">${t('Bought with Dark Matter. Kept forever. Spending Dark Matter does not lower its production bonus.')}</p>
      <div class="tree" id="tree"></div>`;
  }

  refresh(ctx: Ctx): void {
    const { s, d } = ctx;
    if (!cosmosUnlocked(ctx)) {
      this.built = false;
      this.treeKey = '';
      const pct = Math.min(1, Math.log10(Math.max(1, s.earnedAll)) / Math.log10(COSMOS_UNLOCK));
      this.root.innerHTML = `
        <div class="locked-card">
          <div class="locked-ico">${icon('darkMatter')}</div>
          <h3>${t('The Cosmos is sealed')}</h3>
          <p>${t('Earn {n} Stardust in total to learn how to collapse the universe and harvest Dark Matter.', { n: fmt(COSMOS_UNLOCK) })}</p>
          <div class="bar"><div class="bar-fill" style="width:${(pct * 100).toFixed(1)}%"></div></div>
          <p class="dim">${fmt(s.earnedAll)} / ${fmt(COSMOS_UNLOCK)}</p>
        </div>`;
      return;
    }
    if (!this.built) this.build();
    const pending = pendingDarkMatter(s);
    setText($('#dm-amount', this.root), t('{n} Dark Matter', { n: fmt(s.darkMatter) }));
    const dmPct = darkMatterPct(s);
    setText($('#dm-sub', this.root), t('{n} to spend · +{pct} production', { n: fmt(darkMatterAvailable(s)), pct: fmtPercent(dmPct * s.darkMatter) }));
    setText($('#dm-pending', this.root), t('+{n} Dark Matter', { n: fmt(pending) }));
    // What the collapse is worth: the production bonus before and after, and the multiplier.
    const gain = collapseGain(s);
    const gainEl = $('#dm-gain', this.root);
    setHidden(gainEl, pending <= 0);
    if (pending > 0) {
      setText(gainEl, t('Bonus +{from} → +{to} (x{mult})', { from: fmtPercent(dmPct * s.darkMatter), to: fmtPercent(dmPct * (s.darkMatter + pending)), mult: fmtDec(gain, 2) }));
      toggleClass(gainEl, 'good', gain >= 2);
    }
    const nextAt = earningsForNextDarkMatter(s);
    const prevTotal = Math.pow(Math.cbrt(nextAt / DM_SCALE) - 1, 3) * DM_SCALE;
    const frac = Math.max(0, Math.min(1, (s.earnedAll - prevTotal) / (nextAt - prevTotal)));
    ($('#dm-bar', this.root) as HTMLElement).style.width = `${(frac * 100).toFixed(1)}%`;
    setText($('#dm-next', this.root), s.earnedAll < DM_SCALE
      ? t('Your first Dark Matter forms at {n} lifetime Stardust ({have} so far).', { n: fmt(DM_SCALE), have: fmt(s.earnedAll) })
      : t('Next Dark Matter at {n} lifetime Stardust.', { n: fmt(nextAt) }));
    const btn = $('#btn-collapse', this.root) as HTMLButtonElement;
    btn.disabled = !canCollapse(s);

    const key = Object.keys(s.cosmic).join(',') + '|' + darkMatterAvailable(s) + '|' + s.anomaly + Object.keys(s.anomaliesDone).join(',');
    if (key !== this.treeKey) {
      this.treeKey = key;
      this.renderTree(ctx);
      this.renderAnomalies(ctx);
    }
    const a = s.anomaly ? ANOMALY_BY_ID[s.anomaly] : undefined;
    const bar = this.root.querySelector<HTMLElement>('#anomaly-bar');
    if (a && bar) bar.style.width = `${Math.min(100, (Math.log10(Math.max(1, s.earnedRun)) / Math.log10(a.goal)) * 100).toFixed(1)}%`;
    const prog = this.root.querySelector<HTMLElement>('#anomaly-progress');
    if (a && prog) setText(prog, t('{n} / {goal} Stardust', { n: fmt(s.earnedRun), goal: fmt(a.goal) }));
    void d;
  }

  private renderAnomalies(ctx: Ctx): void {
    const s = ctx.s;
    const root = $('#anomalies', this.root);
    if (!anomaliesUnlocked(s)) {
      root.innerHTML = '';
      return;
    }
    const done = Object.keys(s.anomaliesDone).length;
    root.innerHTML = `
      <h3 class="section-title">${t('Anomalies · {n} of {total}', { n: done, total: ANOMALIES.length })}</h3>
      <p class="hint-text">${t('Twisted universes with one strange rule. Reach the goal inside one for a permanent reward. Entering collapses your universe and collects any pending Dark Matter.')}</p>
      <div class="anomalies">${ANOMALIES.map((a) => {
        const isDone = !!s.anomaliesDone[a.id];
        const active = s.anomaly === a.id;
        return `<div class="anomaly ${isDone ? 'done' : ''} ${active ? 'active' : ''}">
          <div class="anomaly-top"><b>${esc(t(a.name))}</b><span class="anomaly-goal">${isDone ? t('Complete') : t('Goal {n}', { n: fmt(a.goal) })}</span></div>
          <div class="dim">${esc(t(a.rule))}</div>
          <div class="anomaly-reward">${esc(t(a.rewardText))}</div>
          ${active ? `<div class="bar"><div class="bar-fill" id="anomaly-bar"></div></div><div class="anomaly-row"><span class="dim small" id="anomaly-progress"></span><button class="btn btn-plain" id="btn-abandon">${t('Leave')}</button></div>`
            : isDone ? '' : `<button class="btn btn-cosmic" data-anomaly="${a.id}" ${s.anomaly ? 'disabled' : ''}>${t('Enter')}</button>`}
        </div>`;
      }).join('')}</div>`;
  }

  private askAnomaly(id: string): void {
    const ctx = this.ctx;
    const a = ANOMALY_BY_ID[id];
    const pending = pendingDarkMatter(ctx.s);
    confirmModal(t('Enter {name}?', { name: t(a.name) }),
      `${t('<b>Rule:</b> {rule}<br><b>Goal:</b> earn {goal} Stardust in this universe.<br><b>Reward:</b> {reward}', { rule: esc(t(a.rule)), goal: fmt(a.goal), reward: esc(t(a.rewardText)) })}<br><br>${pending >= 1 ? t('Your current universe collapses and you collect <b class="dm">+{n} Dark Matter</b>.', { n: fmt(pending) }) : t('Your current universe collapses.')} ${t('You can leave the anomaly at any time.')}`,
      t('Enter'), () => {
        enterAnomaly(ctx.s, ctx.d, id);
        this.afterReset();
        toast(`<div class="t-ico">${icon('darkMatter')}</div><div><b>${esc(t(a.name))}</b><br>${esc(t(a.rule))}</div>`, 'comet', 5000);
      });
  }

  private askAbandon(): void {
    const ctx = this.ctx;
    confirmModal(t('Leave the anomaly?'), t('Your universe collapses into a normal one. Progress towards this anomaly is lost, but pending Dark Matter is collected.'), t('Leave'), () => {
      abandonAnomaly(ctx.s, ctx.d);
      this.afterReset();
    }, true);
  }

  private afterReset(): void {
    const ctx = this.ctx;
    sfxCollapse();
    haptic('heavy');
    ctx.recalc();
    ctx.dirty();
    ctx.save();
    document.body.classList.add('collapsing');
    setTimeout(() => document.body.classList.remove('collapsing'), 1600);
    ctx.sky.setStage(0);
    ctx.showTab('build');
    breakAd(ctx);
  }

  private renderTree(ctx: Ctx): void {
    const s = ctx.s;
    const cols = 5;
    const rows = Math.max(...COSMIC.map((c) => c.y)) + 1;
    const cell = 100 / cols;
    const rowH = 92;
    let lines = '';
    for (const c of COSMIC) {
      for (const r of c.requires) {
        const p = COSMIC_BY_ID[r];
        const on = s.cosmic[c.id] && s.cosmic[r];
        lines += `<line x1="${(p.x + 0.5) * cell}%" y1="${p.y * rowH + 36}" x2="${(c.x + 0.5) * cell}%" y2="${c.y * rowH + 36}" class="${on ? 'on' : ''}"/>`;
      }
    }
    const nodes = COSMIC.map((c) => {
      const owned = !!s.cosmic[c.id];
      const open = cosmicAvailable(s, c.id);
      const afford = open && darkMatterAvailable(s) >= c.cost;
      const cls = owned ? 'owned' : open ? (afford ? 'open afford' : 'open') : 'closed';
      return `<button class="node ${cls}" data-cosmic="${c.id}" style="left:${(c.x + 0.5) * cell}%;top:${c.y * rowH}px" aria-label="${esc(t(c.name))}">
        <span class="node-dot">${icon(owned ? 'darkMatter' : open ? 'darkMatter' : 'lock')}</span>
        <span class="node-name">${esc(t(c.name))}</span>
        ${owned ? '' : `<span class="node-cost">${fmt(c.cost)}</span>`}
      </button>`;
    }).join('');
    $('#tree', this.root).innerHTML = `<svg class="tree-lines" width="100%" height="${rows * rowH}">${lines}</svg>${nodes}`;
    ($('#tree', this.root) as HTMLElement).style.height = `${rows * rowH}px`;
  }

  private showCosmic(id: string): void {
    const ctx = this.ctx;
    const c = COSMIC_BY_ID[id];
    const owned = !!ctx.s.cosmic[id];
    const open = cosmicAvailable(ctx.s, id);
    const needs = c.requires.filter((r) => !ctx.s.cosmic[r]).map((r) => t(COSMIC_BY_ID[r].name));
    const body = `<div class="cosmic-detail"><div class="big-ico">${icon('darkMatter')}</div><p>${esc(t(c.desc))}</p>
      <p class="dim">${owned ? t('Owned.') : t('Costs {cost} Dark Matter. You have {have}.', { cost: fmt(c.cost), have: fmt(darkMatterAvailable(ctx.s)) })}</p>
      ${needs.length ? `<p class="dim">${t('Needs: {list}', { list: needs.map(esc).join(', ') })}</p>` : ''}</div>`;
    openModal({
      title: t(c.name),
      body,
      buttons: owned || !open ? [{ label: t('Close'), kind: 'primary' }] : [
        { label: t('Close'), kind: 'plain' },
        {
          label: t('Buy for {n}', { n: fmt(c.cost) }), kind: 'primary', onClick: () => {
            if (buyCosmic(ctx.s, id)) {
              sfxUpgrade();
              haptic('medium');
              ctx.recalc();
              ctx.dirty();
              ctx.save();
              toast(`<div class="t-ico">${icon('darkMatter')}</div><div><b>${esc(t(c.name))}</b><br>${esc(t(c.desc))}</div>`, 'good');
            } else {
              sfxDenied();
              return false;
            }
            return true;
          },
        },
      ],
    });
  }

  private askCollapse(): void {
    const ctx = this.ctx;
    const pending = pendingDarkMatter(ctx.s);
    if (pending < 1) return;
    const goods = heldValue(ctx.s);
    confirmModal(
      t('Collapse the Universe?'),
      `${t('Everything in this universe collapses: Stardust, generators and upgrades. You keep achievements, Dark Matter and Cosmic upgrades.')}${goods > 0 ? ' ' + t('Your Warp Exchange goods are sold first, for about {n} Stardust; any profit adds to your Dark Matter.', { n: fmt(goods * creditValue(ctx.d)) }) : ''}<br><br>${t('You will gain <b class="dm">+{n} Dark Matter</b>, for <b>+{pct}</b> production or more, forever.', { n: fmt(pending), pct: fmtPercent(pending * 0.02) })}`,
      t('Collapse'),
      () => {
        const gained = collapse(ctx.s, ctx.d);
        sfxCollapse();
        haptic('heavy');
        ctx.recalc();
        ctx.dirty();
        ctx.save();
        document.body.classList.add('collapsing');
        setTimeout(() => document.body.classList.remove('collapsing'), 1600);
        ctx.sky.setStage(stageFor(0));
        ctx.showTab('build');
        breakAd(ctx);
        noteHappyMoment(12000);
        toast(`<div class="t-ico">${icon('darkMatter')}</div><div><b>${t('A new universe begins')}</b><br>${t('+{n} Dark Matter', { n: fmt(gained) })}</div>`, 'good', 5000);
      },
    );
  }
}

// ------------------------------------------------------------------ Probes

export class ProbesPanel implements Panel {
  private key = '';

  constructor(private root: HTMLElement, private ctx: Ctx) {
    root.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      const go = el.closest<HTMLElement>('[data-launch]');
      if (go) {
        if (startExpedition(ctx.s, ctx.d, go.dataset.launch!)) {
          sfxUpgrade();
          haptic('medium');
          ctx.save();
          this.key = '';
        } else sfxDenied();
      }
      if (el.closest('#btn-collect')) this.collect();
    });
  }

  collect(): void {
    const ctx = this.ctx;
    const results = collectExpeditions(ctx.s, ctx.d);
    if (!results.length) return;
    ctx.recalc();
    ctx.save();
    sfxAchievement();
    haptic('medium');
    const lines = results.map((r) => `<li><b>${esc(t(DESTINATION_BY_ID[r.destId].name))}</b>: ${t('+{n} Stardust', { n: fmt(r.stardust) })}${r.relic ? `<br><span class="relic-get">${icon('relic')} ${esc(t('{relic} (level {n})', { relic: t(relicName(r.relic)), n: r.relicLevel }))}</span>` : ''}</li>`).join('');
    openModal({ title: t('Probes are back'), body: `<ul class="result-list">${lines}</ul>` });
    this.key = '';
  }

  refresh(ctx: Ctx): void {
    const { s, d } = ctx;
    const now = Date.now();
    const key = s.expeditions.map((e) => e.id + e.returnsAt).join(',') + '|' + JSON.stringify(s.relics) + '|' + d.expeditionSlots;
    if (key !== this.key) {
      this.key = key;
      const slots = freeSlots(s, d);
      this.root.innerHTML = `
        <div class="probe-head"><div class="probe-ico">${icon('probe')}</div><div><b>${t('Expeditions')}</b><br><span class="dim">${d.expeditionSlots > 1 ? t('{n} probes · rewards scale with your production', { n: d.expeditionSlots }) : t('1 probe · rewards scale with your production')}</span></div></div>
        <div id="probe-active">${s.expeditions.map((e, i) => `
          <div class="probe-run"><div class="probe-run-top"><b>${esc(t(DESTINATION_BY_ID[e.id]?.name ?? e.id))}</b><span class="probe-left" data-i="${i}"></span></div>
          <div class="bar"><div class="bar-fill" data-bar="${i}"></div></div></div>`).join('')}</div>
        <button class="btn btn-primary btn-wide" id="btn-collect" hidden>${t('Collect returned probes')}</button>
        <h3 class="section-title">${t('Destinations')}</h3>
        ${DESTINATIONS.map((dest) => `
          <div class="dest">
            <div class="dest-text"><b>${esc(t(dest.name))}</b><br><span class="dim">${esc(t(dest.desc))}</span><br>
            <span class="dest-meta">${t('{time} · ~{n} Stardust · {pct}% Relic', { time: fmtTime(expeditionDurationMs(d, dest) / 1000), n: fmt(expeditionReward(d, dest)), pct: Math.round(dest.relicChance * 100) })}</span></div>
            <button class="btn btn-buy ${slots > 0 ? 'afford' : ''}" data-launch="${dest.id}" ${slots > 0 ? '' : 'disabled'}>${t('Launch')}</button>
          </div>`).join('')}
        <h3 class="section-title">${t('Relics')}</h3>
        <div class="relics">${RELICS.map((r) => {
          const lvl = s.relics[r.id] ?? 0;
          return `<div class="relic ${lvl ? 'got' : ''}"><div class="relic-ico">${icon(lvl ? 'relic' : 'lock')}</div><div><b>${lvl ? esc(t(r.name)) : t('Unknown relic')}</b> ${lvl ? `<span class="dim">${t('Lv {n}/{max}', { n: lvl, max: r.maxLevel })}</span>` : ''}<br><span class="dim">${lvl ? esc(t(r.desc)) : t('Found on expeditions.')}</span></div></div>`;
        }).join('')}</div>`;
    }
    let ready = false;
    s.expeditions.forEach((e, i) => {
      const left = (e.returnsAt - now) / 1000;
      const frac = Math.min(1, (now - e.startedAt) / Math.max(1, e.returnsAt - e.startedAt));
      const label = this.root.querySelector<HTMLElement>(`.probe-left[data-i="${i}"]`);
      const bar = this.root.querySelector<HTMLElement>(`[data-bar="${i}"]`);
      if (label) setText(label, left > 0 ? fmtTime(left) : t('Returned!'));
      if (bar) bar.style.width = `${(frac * 100).toFixed(1)}%`;
      if (left <= 0) ready = true;
    });
    setHidden(($('#btn-collect', this.root) as HTMLButtonElement), !ready);
  }
}

/** A full-screen ad at a natural break, after the collapse animation. */
function breakAd(ctx: Ctx): void {
  if (!interstitialAllowed(ctx.s)) return;
  ctx.s.lastInterstitialAt = Date.now();
  setTimeout(() => void showInterstitial(), 1800);
}

export function stageName(earned: number): string {
  return t(STAGES[stageFor(earned)].name);
}
