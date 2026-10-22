// Tiny DOM helpers: element lookup, toasts and modals.

import { fmt, fmtPercent, fmtPercentSpoken, fmtSpoken, spokenShortText } from '../core/format.js';
import { t } from '../i18n/index.js';

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`Missing element ${sel}`);
  return el as HTMLElement;
}

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Sets text only when it changed, to keep layout work down. */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Like setText, but screen readers hear a second version with numbers in words ("47.01Qa" is read
 * "47.01 Q a" otherwise). The spoken text is only worked out when the shown text changes.
 */
export function setSpoken(el: HTMLElement, shown: string, spoken: () => string): void {
  let vis = el.firstElementChild as HTMLElement | null;
  if (!vis || !vis.classList.contains('sv')) {
    el.innerHTML = '<span class="sv" aria-hidden="true"></span><span class="sr-only"></span>';
    vis = el.firstElementChild as HTMLElement;
  }
  if (vis.textContent === shown) return;
  vis.textContent = shown;
  (vis.nextElementSibling as HTMLElement).textContent = spoken();
}

/** The same pair as setSpoken, as markup for templates. */
export function spokenHtml(shown: string, spoken: string): string {
  return shown === spoken ? esc(shown) : `<span><span aria-hidden="true">${esc(shown)}</span><span class="sr-only">${esc(spoken)}</span></span>`;
}

/** A number for HTML templates, in words for screen readers. */
export function numHtml(n: number): string {
  return spokenHtml(fmt(n), fmtSpoken(n));
}

export function pctHtml(fraction: number): string {
  return spokenHtml(fmtPercent(fraction), fmtPercentSpoken(fraction));
}

/**
 * Gives every short-form number under root a hidden copy in words for screen readers. Text that
 * already has one (aria-hidden or sr-only) and buttons with their own label are skipped.
 */
export function speakNumbers(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits: Array<[Text, string]> = [];
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const parent = n.parentElement;
    if (!parent || parent.closest('[aria-hidden="true"], .sr-only, button[aria-label], [role="button"][aria-label]')) continue;
    const spoken = spokenShortText(n.data);
    if (spoken !== null) hits.push([n, spoken]);
  }
  for (const [n, spoken] of hits) {
    const shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = n.data;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = spoken;
    // One wrapper, so a flex parent still sees a single item.
    const pair = document.createElement('span');
    pair.append(shown, sr);
    n.replaceWith(pair);
  }
}

/** Keeps speakNumbers applied to everything that appears under root (toasts, windows). */
export function speakNumbersIn(root: HTMLElement): void {
  speakNumbers(root);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') speakNumbers(r.target.parentNode ?? r.target);
      else r.addedNodes.forEach((n) => speakNumbers(n));
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}

const lastHtml = new WeakMap<Element, string>();

/**
 * Replaces an element's content only when the markup changed. Windows redraw on a timer, and
 * rebuilding identical buttons every second dropped keyboard and screen reader focus. When the
 * markup does change (or `force` is set, after code changed the DOM by hand), the focused control is found again by its id and data attributes and refocused.
 */
export function setHtml(el: Element, html: string, force = false): void {
  if (!force && lastHtml.get(el) === html) return;
  lastHtml.set(el, html);
  const active = document.activeElement;
  let key = '';
  if (active && active !== el && el.contains(active)) {
    key = active.tagName.toLowerCase() + (active.id ? '#' + CSS.escape(active.id) : '')
      + [...active.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
  }
  el.innerHTML = html;
  if (key) (el.querySelector(key) as HTMLElement | null)?.focus({ preventScroll: true });
}

/** Shows or hides an element, touching the DOM only when that changes. */
export function setHidden(el: HTMLElement, hidden: boolean): void {
  if (el.hidden !== hidden) el.hidden = hidden;
}

export function toggleClass(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

/** Sets an attribute only when it changes, like setText, so refreshes cost no DOM writes. */
export function setAttr(el: Element, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

let toastRoot: HTMLElement | null = null;

export function toast(html: string, kind: 'info' | 'good' | 'trophy' | 'comet' | 'bad' = 'info', ms = 3200): void {
  toastRoot ??= document.getElementById('toasts');
  if (!toastRoot) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = html;
  el.addEventListener('click', () => el.remove());
  // Over an open window, so a toast it fires (a copy, a share) is seen.
  toastRoot.classList.toggle('over-modal', !!document.querySelector('.modal-backdrop'));
  toastRoot.appendChild(el);
  while (toastRoot.children.length > 2) toastRoot.firstElementChild?.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

export interface ModalOptions {
  title: string;
  body: string;
  /** Buttons from left to right. A handler returning false keeps the modal open. */
  buttons?: Array<{ label: string; kind?: 'primary' | 'danger' | 'plain'; onClick?: (root: HTMLElement) => boolean | void }>;
  onClose?: () => void;
  wide?: boolean;
  dismissable?: boolean;
}

const stack: Array<{ el: HTMLElement; opts: ModalOptions; returnTo: Element | null }> = [];

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside the top dialog, the way Android's own dialogs behave with a keyboard or switch access. */
function trapTab(e: KeyboardEvent, el: HTMLElement): void {
  if (e.key !== 'Tab' || stack[stack.length - 1]?.el !== el) return;
  const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x.matches('.toggle input'));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const at = document.activeElement;
  if (e.shiftKey && (at === first || !items.includes(at as HTMLElement))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (at === last || !el.contains(at))) {
    e.preventDefault();
    first.focus();
  }
}

export function openModal(opts: ModalOptions): HTMLElement {
  const root = document.getElementById('modals')!;
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  const buttons = opts.buttons ?? [{ label: t('Close'), kind: 'primary' }];
  el.innerHTML = `
    <div class="modal${opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}" tabindex="-1">
      <div class="modal-head"><h2>${esc(opts.title)}</h2>${opts.dismissable === false ? '' : `<button class="modal-x" aria-label="${t('Close')}">✕</button>`}</div>
      <div class="modal-body">${opts.body}</div>
      <div class="modal-buttons">${buttons.map((b, i) => `<button class="btn btn-${b.kind ?? 'plain'}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>
    </div>`;
  el.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === el && opts.dismissable !== false) {
      closeModal(el);
      return;
    }
    if (target.closest('.modal-x')) {
      closeModal(el);
      return;
    }
    const btn = target.closest<HTMLElement>('.modal-buttons button');
    if (btn) {
      const b = buttons[Number(btn.dataset.i)];
      if (b.onClick?.(el) !== false) closeModal(el);
    }
  });
  // Windows that redraw with setHtml skip the first redraw when nothing changed since opening.
  lastHtml.set(el.querySelector('.modal-body')!, opts.body);
  el.addEventListener('keydown', (e) => trapTab(e, el));
  const returnTo = document.activeElement;
  root.appendChild(el);
  stack.push({ el, opts, returnTo });
  // Move focus into the dialog so screen readers and keyboards start there, not behind it.
  el.querySelector<HTMLElement>('.modal')!.focus({ preventScroll: true });
  requestAnimationFrame(() => el.classList.add('in'));
  return el;
}

export function closeModal(el?: HTMLElement): boolean {
  const entry = el ? stack.find((m) => m.el === el) : stack[stack.length - 1];
  if (!entry) return false;
  stack.splice(stack.indexOf(entry), 1);
  entry.el.classList.remove('in');
  setTimeout(() => entry.el.remove(), 200);
  const back = stack.length ? stack[stack.length - 1].el.querySelector<HTMLElement>('.modal') : entry.returnTo;
  if (entry.el.contains(document.activeElement) && back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
  entry.opts.onClose?.();
  return true;
}

export function topModalDismissable(): boolean {
  const top = stack[stack.length - 1];
  return !!top && top.opts.dismissable !== false;
}

export function modalOpen(): boolean {
  return stack.length > 0;
}

export function confirmModal(title: string, body: string, yes: string, onYes: () => void, danger = false): void {
  openModal({
    title,
    body: `<p>${body}</p>`,
    buttons: [
      { label: t('Cancel'), kind: 'plain' },
      { label: yes, kind: danger ? 'danger' : 'primary', onClick: () => onYes() },
    ],
  });
}
