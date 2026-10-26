// The Build tab: buy amount, the strip of ready upgrades and the generator list.

import { GENERATORS } from '../data/generators.js';
import { UPGRADE_BY_ID, tierBand, toNextTier } from '../data/upgrades.js';
import { availableUpgrades, buyGenerator, buyUpgrade, generatorPrice, generatorRevealed, generatorVisible, maxAffordable, upgradePrice } from '../core/economy.js';
import { fmt, fmtPercent, fmtRate, fmtRateSpoken, fmtSpoken } from '../core/format.js';
import { sfxBuy, sfxDenied, sfxUpgrade } from './audio.js';
import { buyAmountFrom, type Ctx, type Panel } from './ctx.js';
import type { BuyAmountSetting } from '../core/state.js';
import { $, esc, setAttr, setHidden, setSpoken, setText, toast, toggleClass } from './dom.js';
import { icon } from './icons.js';
import { haptic } from './platform.js';
import { crystalsUnlocked } from '../core/crystals.js';
import { openCrystals, openForge, openGarden, openMarket } from './menus.js';
import { gardenUnlocked, plotCount, readyPlots } from '../core/garden.js';
import { forgeUnlocked, maxHeat, syncHeat } from '../core/forge.js';
import { GOODS, marketUnlocked, syncMarket } from '../core/market.js';
import { t, tDesc, tName } from '../i18n/index.js';

interface Row {
  el: HTMLElement;
  tier: HTMLElement;
  tierKey: string;
  name: HTMLElement;
  price: HTMLElement;
  priceSr: HTMLElement;
  sub: HTMLElement;
  owned: HTMLElement;
  qty: HTMLElement;
}

export class BuildPanel implements Panel {
  private rows: Row[] = [];
  private strip: HTMLElement;
  private stripKey = '';

  constructor(private root: HTMLElement, ctx: Ctx) {
    root.innerHTML = `
      <div class="buy-row" role="group" aria-label="${t('Buy amount')}">
        <span class="buy-label">${t('Buy')}</span>
        <button class="crystal-chip" data-crystals="1" hidden aria-label="${t('Quasar Crystals')}">${icon('crystal')}<b class="crystal-n">0</b></button>
        ${(['1', '10', '100', 'next', 'max'] as const).map((a) => `<button class="chip" data-amt="${a}"${a === 'next' ? ` title="${t('Buy up to the next tier upgrade')}"` : ''}>${a === 'max' ? t('Max') : a === 'next' ? t('Next') : 'x' + a}</button>`).join('')}
        <button class="chip chip-auto" data-auto="1" hidden aria-pressed="false" title="${t('Auto-Fabricators')}">${t('Auto')}</button>
      </div>
      <div class="mini-row" hidden>
        <button class="mini" data-garden="1" hidden>${icon('sprout')}<span><b>${t('Garden')}</b><i class="mini-sub garden-sub"></i></span></button>
        <button class="mini mini-forge" data-forge="1" hidden>${icon('anvil')}<span><b>${t('Forge')}</b><i class="mini-sub forge-sub"></i></span></button>
        <button class="mini mini-market" data-market="1" hidden>${icon('exchange')}<span><b>${t('Market')}</b><i class="mini-sub market-sub"></i></span></button>
      </div>
      <div class="upg-strip" id="upg-strip" aria-label="${t('Ready upgrades')}"></div>
      <div class="gen-list" id="gen-list"></div>`;
    this.strip = $('#upg-strip', root);
    const list = $('#gen-list', root);
    GENERATORS.forEach((g, i) => {
      const el = document.createElement('button');
      el.className = 'gen';
      el.dataset.gen = String(i);
      el.innerHTML = `
        <div class="gen-ico">${icon(g.id)}</div>
        <div class="gen-main">
          <div class="gen-name"></div>
          <div class="gen-price"><span class="sd-dot"></span><span class="p" aria-hidden="true"></span><span class="sr-only ps"></span><span class="q"></span></div>
          <div class="gen-sub"></div>
          <div class="gen-tier" aria-hidden="true" hidden><i></i></div>
        </div>
        <div class="gen-owned"></div>`;
      list.appendChild(el);
      this.rows.push({ el, tier: $('.gen-tier', el), tierKey: '', name: $('.gen-name', el), price: $('.p', el), priceSr: $('.ps', el), qty: $('.q', el), sub: $('.gen-sub', el), owned: $('.gen-owned', el) });
    });

    root.querySelector('.mini-row')!.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-garden]')) openGarden(ctx, () => this.refresh(ctx));
      else if (el.closest('[data-forge]')) openForge(ctx, () => this.refresh(ctx));
      else if (el.closest('[data-market]')) openMarket(ctx, () => this.refresh(ctx));
    });

    root.querySelector('.buy-row')!.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-crystals]')) {
        openCrystals(ctx, () => this.refresh(ctx));
        return;
      }
      if ((e.target as HTMLElement).closest('[data-auto]')) {
        ctx.s.autoBuyOn = !ctx.s.autoBuyOn;
        haptic('light');
        toast(ctx.s.autoBuyOn ? t('Auto-Fabricators on: they buy the best-value generator.') : t('Auto-Fabricators off.'), 'info');
        ctx.save();
        this.refresh(ctx);
        return;
      }
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-amt]');
      if (!b) return;
      const v = b.dataset.amt!;
      ctx.buyAmount = buyAmountFrom(v as BuyAmountSetting);
      // Remembered so a player who always buys with Max doesn't have to pick it every session.
      ctx.s.settings.buyAmount = v as BuyAmountSetting;
      ctx.save();
      this.refresh(ctx);
    });

    const buyRow = (el: HTMLElement): boolean => {
      const gen = Number(el.dataset.gen);
      if (!generatorVisible(ctx.s, gen)) return false;
      const n = buyGenerator(ctx.s, ctx.d, gen, ctx.buyAmount === 'next' ? toNextTier(gen, ctx.s.generators[gen]) : ctx.buyAmount);
      if (n <= 0) return false;
      sfxBuy();
      haptic('light');
      el.classList.remove('bought');
      void el.offsetWidth;
      el.classList.add('bought');
      ctx.recalc();
      this.refresh(ctx);
      return true;
    };

    // Tap to buy; press and hold to keep buying.
    let holdTimer = 0;
    let repeated = false;
    const stopHold = (): void => {
      clearTimeout(holdTimer);
      clearInterval(holdTimer);
      holdTimer = 0;
    };
    list.addEventListener('pointerdown', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.gen');
      if (!el) return;
      repeated = false;
      stopHold();
      holdTimer = window.setTimeout(() => {
        holdTimer = window.setInterval(() => {
          repeated = true;
          if (!buyRow(el)) stopHold();
        }, 110);
      }, 420);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) list.addEventListener(ev, stopHold);
    list.addEventListener('scroll', stopHold, { passive: true });
    list.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('.gen');
      if (!el) return;
      if (repeated) {
        repeated = false;
        return;
      }
      if (!buyRow(el)) sfxDenied();
    });

    this.strip.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-upg]');
      if (!el) return;
      const id = el.dataset.upg!;
      const u = UPGRADE_BY_ID[id];
      if (buyUpgrade(ctx.s, ctx.d, id)) {
        sfxUpgrade();
        haptic('medium');
        toast(`<div class="t-ico">${icon(u.icon)}</div><div><b>${esc(tName(u))}</b><br>${esc(tDesc(u))}</div>`, 'good');
        ctx.recalc();
        ctx.dirty();
      } else {
        sfxDenied();
        toast(`<div class="t-ico">${icon(u.icon)}</div><div><b>${esc(tName(u))}</b> · ${fmt(upgradePrice(ctx.d, u))}<br>${esc(tDesc(u))}</div>`);
      }
    });
  }

  refresh(ctx: Ctx): void {
    const { s, d } = ctx;
    this.root.querySelectorAll<HTMLElement>('[data-amt]').forEach((b) => {
      toggleClass(b, 'on', String(ctx.buyAmount) === b.dataset.amt);
      setAttr(b, 'aria-pressed', String(String(ctx.buyAmount) === b.dataset.amt));
    });
    const chip = this.root.querySelector<HTMLElement>('[data-crystals]')!;
    setHidden(chip, !crystalsUnlocked(s));
    setText(chip.querySelector<HTMLElement>('.crystal-n')!, String(s.crystals));
    toggleClass(chip, 'ready', s.crystals > 0);
    // Minigames opened by crystal levels.
    const garden = this.root.querySelector<HTMLElement>('[data-garden]')!;
    setHidden(garden, !gardenUnlocked(s));
    const ripe = garden.hidden ? 0 : readyPlots(s);
    const planted = s.garden.slice(0, plotCount(s)).filter(Boolean).length;
    setText(garden.querySelector<HTMLElement>('.garden-sub')!, ripe ? t('{n} ready', { n: ripe }) : planted ? t('{n} growing', { n: planted }) : t('Plots empty'));
    toggleClass(garden, 'ready', ripe > 0);
    const forge = this.root.querySelector<HTMLElement>('[data-forge]')!;
    setHidden(forge, !forgeUnlocked(s));
    if (!forge.hidden) {
      const heat = Math.floor(syncHeat(s));
      const max = maxHeat(s);
      setText(forge.querySelector<HTMLElement>('.forge-sub')!, t('{heat}/{max} heat', { heat, max }));
      toggleClass(forge, 'ready', heat >= max);
    }
    const market = this.root.querySelector<HTMLElement>('[data-market]')!;
    setHidden(market, !marketUnlocked(s));
    if (!market.hidden) {
      const m = syncMarket(s)!;
      // Flag a bargain: any good well under its resting price.
      const cheap = GOODS.findIndex((g, i) => m.goods[i].price < g.rest * 0.75);
      const held = m.goods.reduce((n, g) => n + g.held, 0);
      setText(market.querySelector<HTMLElement>('.market-sub')!, cheap >= 0 ? t('{good} cheap', { good: t(GOODS[cheap].short) }) : held ? t('{n} held', { n: held }) : t('Prices steady'));
      toggleClass(market, 'ready', cheap >= 0);
    }
    setHidden(this.root.querySelector<HTMLElement>('.mini-row')!, !gardenUnlocked(s) && !forgeUnlocked(s) && !marketUnlocked(s));
    const auto = this.root.querySelector<HTMLElement>('[data-auto]')!;
    setHidden(auto, !d.autoBuy);
    toggleClass(auto, 'on', s.autoBuyOn);
    if (auto.getAttribute('aria-pressed') !== String(s.autoBuyOn)) auto.setAttribute('aria-pressed', String(s.autoBuyOn));

    // Upgrade strip: every unlocked upgrade, cheapest first.
    const ups = d.noUpgrades ? [] : availableUpgrades(s).slice(0, 24);
    const key = ups.map((u) => u.id).join(',') + d.noUpgrades;
    if (key !== this.stripKey) {
      this.stripKey = key;
      this.strip.innerHTML = d.noUpgrades ? `<div class="strip-empty">${t('No upgrades in this anomaly')}</div>` : ups.length
        ? ups.map((u) => `<button class="upg-chip" data-upg="${u.id}" aria-label="${esc(tName(u))}">${icon(u.icon)}<span class="tier">${u.group === 'generator' ? romans(u.tier + 1) : ''}</span></button>`).join('')
        : `<div class="strip-empty">${t('Upgrades appear here as your empire grows')}</div>`;
    }
    this.strip.querySelectorAll<HTMLElement>('[data-upg]').forEach((el) => {
      const u = UPGRADE_BY_ID[el.dataset.upg!];
      toggleClass(el, 'afford', upgradePrice(d, u) <= s.stardust);
    });

    let shownNext = false;
    this.rows.forEach((row, i) => {
      const visible = generatorVisible(s, i);
      // Show one locked teaser row below the last visible generator.
      const teaser = !visible && !shownNext && i > 0 && generatorVisible(s, i - 1);
      if (!visible && !teaser) {
        toggleClass(row.el, 'gone', true);
        return;
      }
      if (teaser) shownNext = true;
      toggleClass(row.el, 'gone', false);
      const locked = i > d.maxGen;
      toggleClass(row.el, 'locked', locked);
      const revealed = visible && generatorRevealed(s, i);
      toggleClass(row.el, 'mystery', !revealed);
      const g = GENERATORS[i];
      setText(row.name, revealed ? t(g.name) : '???');
      const amount = ctx.buyAmount === 'max' ? Math.max(1, maxAffordable(s, d, i))
        : ctx.buyAmount === 'next' ? toNextTier(i, s.generators[i]) : ctx.buyAmount;
      const price = generatorPrice(s, d, i, amount);
      const priceText = fmt(price);
      if (row.price.textContent !== priceText) {
        row.price.textContent = priceText;
        setText(row.priceSr, fmtSpoken(price));
      }
      setText(row.qty, amount > 1 ? ` x${amount}` : '');
      const canBuy = visible && !locked && price <= s.stardust;
      toggleClass(row.el, 'afford', canBuy);
      // TalkBack reads "disabled" on a card you cannot buy yet, as sighted players see it dimmed.
      setAttr(row.el, 'aria-disabled', String(!canBuy));
      const owned = s.generators[i];
      setText(row.owned, owned ? String(owned) : '');
      // Progress toward the next tier upgrade (5, 25, 50 ... 250 owned), the bar resets at each one.
      const band = owned > 0 && !locked ? tierBand(i, owned) : null;
      const key = band ? `${owned}/${band.to}` : '';
      if (key !== row.tierKey) {
        row.tierKey = key;
        setHidden(row.tier, !band);
        if (band) {
          (row.tier.firstElementChild as HTMLElement).style.width = `${(100 * (owned - band.from)) / (band.to - band.from)}%`;
          row.tier.title = t('{n} owned; the next upgrade unlocks at {to}', { n: owned, to: band.to });
        }
      }
      if (locked) {
        setText(row.sub, t('Cannot be built in this anomaly'));
      } else if (!revealed) {
        setText(row.sub, teaser ? t('Buy the one above to discover') : t('Earn more Stardust to discover'));
      } else if (owned) {
        const each = d.genSps[i] / owned;
        const share = d.baseSps > 0 ? d.genSps[i] / d.baseSps : 0;
        const subLine = (rate: (n: number) => string): string => t('{each}/s each · {share} of total', { each: rate(each), share: fmtPercent(share) });
        setSpoken(row.sub, subLine(fmtRate), () => subLine(fmtRateSpoken));
      } else {
        setText(row.sub, t(g.flavor));
      }
    });
  }
}

function romans(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n);
}
