// In-app purchases and the Shop screen. In the app this drives Google Play
// Billing through cordova-plugin-purchase (the global CdvPurchase). In a
// browser it shows a test checkout so every product can be tried without a
// store account; nothing is charged there.

import { PRODUCTS, PRODUCT_BY_ID, SKINS, type Product } from '../data/store.js';
import { crystalsUnlocked } from '../core/crystals.js';
import { currentEvent, eventActive, eventTimeLeft } from '../core/event.js';
import { currentPass, seasonTimeLeft } from '../core/pass.js';
import { fmt, fmtDec, fmtTime } from '../core/format.js';
import { HALO_STREAK } from '../core/wheel.js';
import {
  STARTER_PCT, SUPPORTER_MULT, VAULT_CAP_HOURS, VAULT_HOURS_PER_CRYSTAL, VAULT_RATE,
  canBuy, fillVault, grant, owns, setSkin, starterOfferLeft, vaultValue,
} from '../core/shop.js';
import { sfxAchievement } from './audio.js';
import type { Ctx } from './ctx.js';
import { esc, numHtml, openModal, toast } from './dom.js';
import { t } from '../i18n/index.js';
import { icon } from './icons.js';
import { haptic, isNative } from './platform.js';
import { setBanner } from './ads.js';

// The parts of cordova-plugin-purchase (v13) used here.
interface CdvOffer { order(): Promise<unknown> }
interface CdvProduct { id: string; owned: boolean; pricing?: { price: string }; getOffer(): CdvOffer | undefined }
interface CdvTransaction { products: Array<{ id: string }>; finish(): Promise<void> }
interface CdvWhen {
  approved(cb: (t: CdvTransaction) => void): CdvWhen;
  productUpdated(cb: (p: CdvProduct) => void): CdvWhen;
}
interface CdvStore {
  register(p: Array<{ id: string; type: string; platform: string }>): void;
  when(): CdvWhen;
  initialize(platforms: string[]): Promise<unknown>;
  get(id: string, platform?: string): CdvProduct | undefined;
  restorePurchases(): Promise<unknown>;
  error(cb: (e: { message: string; code?: number }) => void): void;
}
interface CdvGlobal {
  store: CdvStore;
  ProductType: { CONSUMABLE: string; NON_CONSUMABLE: string };
  Platform: { GOOGLE_PLAY: string; APPLE_APPSTORE: string };
}

function cdv(): CdvGlobal | undefined {
  return (window as unknown as { CdvPurchase?: CdvGlobal }).CdvPurchase;
}

function platformId(c: CdvGlobal): string {
  const p = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.();
  return p === 'ios' ? c.Platform.APPLE_APPSTORE : c.Platform.GOOGLE_PLAY;
}

let appCtx: Ctx | null = null;
let nativeReady = false;
/** Resolves the purchase the player is waiting on, by product id. */
const waiting = new Map<string, (ok: boolean) => void>();

/** Real store when running in the app with the billing plugin; test checkout otherwise. */
export function storeIsLive(): boolean {
  return isNative() && nativeReady;
}

export function storeAvailable(): boolean {
  return !isNative() || nativeReady;
}

/** Local price from the store when known, else the US price from the catalogue. */
export function productPrice(id: string): string {
  const c = cdv();
  if (c && nativeReady) {
    const p = c.store.get(id, platformId(c));
    if (p?.pricing?.price) return p.pricing.price;
  }
  return PRODUCT_BY_ID[id]?.price ?? '';
}

function applyGrant(id: string): void {
  const ctx = appCtx;
  if (!ctx) return;
  const g = grant(ctx.s, ctx.d, id);
  if (!g) return;
  if (id === 'supporter_pack') void setBanner(false);
  if (id.startsWith('skin_')) ctx.sky.setSkin(ctx.s.skin);
  ctx.recalc();
  ctx.dirty();
  ctx.save();
  sfxAchievement();
  haptic('heavy');
  const p = PRODUCT_BY_ID[id];
  const parts = [g.stardust ? t('+{n} Stardust', { n: fmt(g.stardust) }) : '', g.crystals ? t('+{n} crystals', { n: g.crystals }) : ''].filter(Boolean).join(' · ');
  const text = id.startsWith('skin_') ? t('{name} unlocked and applied.', { name: t(p.name) }) : t(g.text);
  toast(`<div class="t-ico">${icon(p.icon)}</div><div><b>${esc(t(p.name))}</b><br>${esc(text)}${parts ? `<br>${parts}` : ''}</div>`, 'good', 6000);
}

/** Connects to the store once at start-up. Safe to call in a browser. */
export async function initStore(ctx: Ctx): Promise<void> {
  appCtx = ctx;
  const c = cdv();
  if (!isNative() || !c) return;
  const platform = platformId(c);
  try {
    c.store.register(PRODUCTS.map((p) => ({
      id: p.id,
      type: p.kind === 'consumable' ? c.ProductType.CONSUMABLE : c.ProductType.NON_CONSUMABLE,
      platform,
    })));
    c.store.when()
      .approved((t) => {
        // Grant first, then finish, so a crash in between replays the purchase
        // on the next launch instead of losing it.
        for (const p of t.products) {
          applyGrant(p.id);
          waiting.get(p.id)?.(true);
          waiting.delete(p.id);
        }
        void t.finish();
      })
      .productUpdated((p) => {
        // Owned one-time products (bought on another device, or restored).
        if (p.owned && PRODUCT_BY_ID[p.id]?.kind === 'nonconsumable') applyGrant(p.id);
      });
    c.store.error((e) => console.warn('Store error', e.code, e.message));
    await c.store.initialize([platform]);
    nativeReady = true;
  } catch (e) {
    console.warn('Store unavailable', e);
  }
}

/** Buys a product. Resolves true once it is granted. */
export function buyProduct(ctx: Ctx, id: string): Promise<boolean> {
  appCtx = ctx;
  const p = PRODUCT_BY_ID[id];
  if (!p || !canBuy(ctx.s, id)) return Promise.resolve(false);
  const c = cdv();
  if (isNative()) {
    if (!c || !nativeReady) {
      toast(t('The store is not available right now. Check your connection and try again.'), 'bad');
      return Promise.resolve(false);
    }
    const offer = c.store.get(id, platformId(c))?.getOffer();
    if (!offer) {
      toast(t('This item is not available in your store yet.'), 'bad');
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      waiting.set(id, resolve);
      // order() resolves with an error when the player cancels; approval comes through initStore.
      void offer.order().then((err) => {
        if (err && waiting.has(id)) {
          waiting.delete(id);
          resolve(false);
        }
      });
    });
  }
  return testCheckout(p).then((ok) => {
    if (ok) applyGrant(id);
    return ok;
  });
}

function testCheckout(p: Product): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean): void => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    openModal({
      title: t('Checkout'),
      body: `<div class="fake-ad"><div class="fake-ad-tag">${t('Test purchase')}</div>
        <p><b>${esc(t(p.name))}</b> · ${esc(p.price)}</p><p class="dim small">${esc(t(p.desc))}</p>
        <p class="dim small">${t('In the app this opens Google Play. Here nothing is charged.')}</p></div>`,
      onClose: () => finish(false),
      buttons: [
        { label: t('Cancel'), kind: 'plain', onClick: () => finish(false) },
        { label: t('Buy {price}', { price: p.price }), kind: 'primary', onClick: () => finish(true) },
      ],
    });
  });
}

export async function restorePurchases(): Promise<void> {
  const c = cdv();
  if (!c || !nativeReady) {
    toast(t('The store is not available right now.'), 'bad');
    return;
  }
  await c.store.restorePurchases();
  toast(t('Purchases restored.'), 'good');
}

// ------------------------------------------------------------------ Shop

function buyButton(ctx: Ctx, id: string, label?: string): string {
  const ok = canBuy(ctx.s, id);
  return `<button class="btn ${ok ? 'btn-primary' : 'btn-plain'} shop-buy" data-buy="${id}" ${ok ? '' : 'disabled'}>${esc(label ?? productPrice(id))}</button>`;
}

export function openShop(ctx: Ctx, onChange: () => void): void {
  const render = (): string => {
    const { s, d } = ctx;
    const now = Date.now();
    fillVault(s, now);
    const parts: string[] = [];

    const starterLeft = starterOfferLeft(s, now);
    if (starterLeft > 0) {
      parts.push(`<div class="shop-card shop-feature">
        <div class="shop-kicker">${t('New player offer · ends in {time}', { time: fmtTime(starterLeft / 1000) })}</div>
        <div class="shop-row">${icon('gift')}<div class="shop-main"><b>${t('Starter Pack')}</b><span>${t('10 Quasar Crystals, 4 hours of production and +{pct}% production forever.', { pct: STARTER_PCT * 100 })}</span></div>${buyButton(ctx, 'starter_pack')}</div>
      </div>`);
    }

    parts.push(`<div class="shop-card${owns(s, 'supporter_pack') ? ' owned' : ''}">
      <div class="shop-row">${icon('trophy')}<div class="shop-main"><b>${t('Supporter Pack')}</b><span>${t('No break ads or banners, ever. Production x{n} forever. Optional reward ads stay for their bonuses.', { n: SUPPORTER_MULT })}</span></div>
      ${owns(s, 'supporter_pack') ? `<span class="shop-owned">${t('Owned')}</span>` : buyButton(ctx, 'supporter_pack')}</div></div>`);

    const v = vaultValue(s, d);
    parts.push(`<div class="shop-card">
      <div class="shop-row">${icon('darkMatter')}<div class="shop-main"><b>${t('Stardust Vault')}</b><span>${t('Saves {n} minutes of production every hour, even while you are away, up to {cap} hours.', { n: VAULT_RATE * 60, cap: VAULT_CAP_HOURS })}${crystalsUnlocked(s) ? ` ${t('Plus a crystal for every {n} hours saved.', { n: VAULT_HOURS_PER_CRYSTAL })}` : ''}</span></div></div>
      <div class="bar"><div class="bar-fill vault-fill" style="width:${(s.vaultHours / VAULT_CAP_HOURS) * 100}%"></div></div>
      <div class="shop-row shop-sub"><span class="dim small">${t('{n} of {cap} hours saved · worth {sd} Stardust', { n: fmtDec(s.vaultHours), cap: VAULT_CAP_HOURS, sd: numHtml(v.stardust) })}${v.crystals ? (v.crystals === 1 ? t(' and 1 crystal') : t(' and {n} crystals', { n: v.crystals })) : ''}</span>
      ${buyButton(ctx, 'vault_open', s.vaultHours >= 1 ? t('Open {price}', { price: productPrice('vault_open') }) : t('Filling'))}</div></div>`);

    const pass = currentPass(s, now);
    parts.push(`<div class="shop-card">
      <div class="shop-row">${icon('trophy')}<div class="shop-main"><b>${t('Star Pass Premium')}</b><span>${t('This season (ends in {time}): a second reward track with double Stardust, 20 crystals, 2 Contract Medals and the Aurora skin. Rewards for tiers you already reached are paid at once.', { time: fmtTime(seasonTimeLeft(now) / 1000) })}</span></div>
      ${pass.premium ? `<span class="shop-owned">${t('Active')}</span>` : buyButton(ctx, 'star_pass')}</div></div>`);

    const e = currentEvent(s, now);
    parts.push(`<div class="shop-card">
      <div class="shop-row">${icon('rift')}<div class="shop-main"><b>${t('Event Pass')}</b><span>${e ? t('This weekend: double Flux and a Platinum badge worth 12 hours of production and 10 crystals.') : eventActive(now) ? t('Opens with the next weekend event.') : t('Opens with the next weekend event, in {time}.', { time: fmtTime(eventTimeLeft(now) / 1000) })}</span></div>
      ${e?.pass ? `<span class="shop-owned">${t('Active')}</span>` : buyButton(ctx, 'event_pass')}</div></div>`);

    const packs = ['crystals_5', 'crystals_30', 'crystals_80'].map((id) => {
      const p = PRODUCT_BY_ID[id];
      return `<div class="shop-pack">${icon('crystal')}<b>${esc(p.desc.split(' ')[0])}</b><span class="dim small">${esc(t(p.name))}</span>${buyButton(ctx, id)}</div>`;
    }).join('');
    parts.push(`<div class="shop-card"><div class="shop-head"><b>${t('Quasar Crystals')}</b>${crystalsUnlocked(s) ? `<span class="dim small">${t('You have {n}', { n: s.crystals })}</span>` : `<span class="dim small">${t('Unlock at 1B lifetime Stardust')}</span>`}</div>
      <div class="shop-packs">${packs}</div></div>`);

    const skins = [{ id: 'default', name: 'Classic', swatch: ['#a99a8a', '#3e5fa8'] as [string, string] }, ...SKINS].map((k) => {
      const have = k.id === 'default' || owns(s, `skin_${k.id}`);
      const using = s.skin === k.id;
      return `<div class="shop-skin${using ? ' using' : ''}"><span class="skin-swatch" style="background:radial-gradient(circle at 35% 30%, ${k.swatch[0]}, ${k.swatch[1]})"></span>
        <b>${esc(t(k.name))}</b>${using ? `<span class="shop-owned">${t('In use')}</span>` : have ? `<button class="btn btn-plain shop-buy" data-skin="${k.id}">${t('Use')}</button>` : 'exclusive' in k && k.exclusive ? `<span class="dim small shop-owned-note">${t('Star Pass reward')}</span>` : buyButton(ctx, `skin_${k.id}`)}</div>`;
    }).join('');
    const halo = s.haloEarned
      ? `<button class="btn btn-plain shop-buy" data-halo aria-pressed="${s.haloOn}">${s.haloOn ? t('Hide') : t('Show')}</button>`
      : `<span class="dim small shop-owned-note">${t('{n}-day spin streak', { n: HALO_STREAK })}</span>`;
    parts.push(`<div class="shop-card"><div class="shop-head"><b>${t('Planet skins')}</b><span class="dim small">${t('Looks only')}</span></div><div class="shop-skins">${skins}</div>
      <div class="shop-row shop-halo"><span class="halo-swatch" aria-hidden="true"></span><div class="shop-main"><b>${t('Golden Halo')}</b><span>${t('A golden sky trail that circles your world.')}</span></div>${halo}</div></div>`);

    if (isNative()) parts.push(`<button class="btn btn-plain btn-wide" data-restore="1">${t('Restore purchases')}</button>`);
    if (!storeIsLive()) parts.push(`<p class="dim small">${isNative() ? t('The store could not be reached, so prices may be out of date.') : t('Browser preview: purchases here are tests and nothing is charged.')}</p>`);
    return parts.join('');
  };
  const el = openModal({ title: t('Shop'), body: render(), onClose: () => clearInterval(timer) });
  const body = el.querySelector<HTMLElement>('.modal-body')!;
  let busy = false;
  const redraw = (): void => { body.innerHTML = render(); };
  const timer = setInterval(() => { if (!busy) redraw(); }, 1000);
  body.addEventListener('click', (e) => {
    const el2 = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-buy],[data-skin],[data-halo],[data-restore]');
    if (!el2 || el2.disabled || busy) return;
    if (el2.dataset.skin) {
      if (setSkin(ctx.s, el2.dataset.skin)) {
        ctx.sky.setSkin(ctx.s.skin);
        haptic('light');
        ctx.save();
      }
      redraw();
      return;
    }
    if (el2.dataset.halo !== undefined) {
      ctx.s.haloOn = !ctx.s.haloOn;
      ctx.sky.halo = ctx.s.haloEarned && ctx.s.haloOn;
      haptic('light');
      ctx.save();
      redraw();
      return;
    }
    busy = true;
    const done = (): void => { busy = false; redraw(); onChange(); };
    if (el2.dataset.restore) void restorePurchases().then(done);
    else void buyProduct(ctx, el2.dataset.buy!).then(done);
  });
}

/** One-time pop-up for the starter offer, after the player has settled in. */
export function maybeOfferStarter(ctx: Ctx): void {
  const s = ctx.s;
  if (s.starterOffered || s.playSeconds < 20 * 60 || starterOfferLeft(s) <= 0 || !storeAvailable()) return;
  s.starterOffered = true;
  ctx.save();
  openModal({
    title: t('Starter Pack'),
    body: `<div class="shop-offer">${icon('gift')}<p><b>${t('A one-time offer for new commanders.')}</b></p>
      <p>${t('10 Quasar Crystals, 4 hours of production and +{pct}% production forever, for {price}.', { pct: STARTER_PCT * 100, price: esc(productPrice('starter_pack')) })}</p>
      <p class="dim small">${t('Available for {time} more in the Shop.', { time: fmtTime(starterOfferLeft(s) / 1000) })}</p></div>`,
    buttons: [
      { label: t('Not now'), kind: 'plain' },
      { label: t('Get it {price}', { price: productPrice('starter_pack') }), kind: 'primary', onClick: () => { void buyProduct(ctx, 'starter_pack'); } },
    ],
  });
}
