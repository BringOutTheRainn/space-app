// Number and time formatting for the UI. Numbers are plain doubles.

const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

const LONG = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion', 'duodecillion', 'tredecillion', 'quattuordecillion', 'quindecillion', 'sexdecillion', 'septendecillion', 'octodecillion', 'novemdecillion', 'vigintillion'];

export type NumberStyle = 'short' | 'scientific';

let style: NumberStyle = 'short';

export function setNumberStyle(s: NumberStyle): void {
  style = s;
}

// Brazil, France and Germany write 2,5 for two and a half.
let locale = 'en-US';
let comma = false;
// Hours, minutes and seconds are the same symbols everywhere; the day is "j" (jour) in French and
// "T" (Tag) in German.
let dayUnit = 'd';

export function setNumberLocale(tag: string): void {
  locale = tag;
  spokenFmt = sciFmt = null;
  comma = tag.startsWith('pt') || tag.startsWith('fr') || tag.startsWith('de');
  dayUnit = tag.startsWith('fr') ? 'j' : tag.startsWith('de') ? 'T' : 'd';
}

function mark(text: string): string {
  return comma ? text.replace('.', ',') : text;
}

/** A rate such as Dark Matter per hour: one decimal below 100 (6.1), short form above (21.95K). */
export function fmtRateSmall(n: number): string {
  return n < 100 ? fmtDec(n) : fmt(n);
}

/** A plain decimal such as 2.5, written the local way. */
export function fmtDec(n: number, digits = 1): string {
  return mark(n.toFixed(digits));
}

function trimFixed(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.?0+$/, '');
}

/** Short form for counters and prices: 999, 1.23K, 45.6M, 1.00e+66. */
export function fmt(n: number, decimalsUnder1000 = 0): string {
  return mark(fmtRaw(n, decimalsUnder1000));
}

function fmtRaw(n: number, decimalsUnder1000: number): string {
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n < 0) return '-' + fmtRaw(-n, decimalsUnder1000);
  if (n < 1000) {
    if (decimalsUnder1000 > 0 && n < 100 && n !== Math.floor(n)) return trimFixed(n, decimalsUnder1000);
    return Math.floor(n).toString();
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (style === 'scientific' || tier >= SHORT.length) {
    const exp = Math.floor(Math.log10(n));
    const mant = n / Math.pow(10, exp);
    return mant.toFixed(2) + 'e' + exp;
  }
  const scaled = n / Math.pow(1000, tier);
  // Guard against 999.995 rounding up to "1000.00K".
  const digits = scaled >= 100 ? 1 : 2;
  let text = scaled.toFixed(digits);
  if (parseFloat(text) >= 1000) return fmtRaw(Math.pow(1000, tier + 1), decimalsUnder1000);
  text = trimFixed(scaled, digits);
  return text + SHORT[tier];
}

/**
 * The same number for screen readers, which read "14.41Qa" letter by letter: "14.41 quadrillion" in
 * English, and the local word ("14,41 Billionen") elsewhere up to 10^18, then scientific.
 */
let spokenFmt: Intl.NumberFormat | null = null;
let sciFmt: Intl.NumberFormat | null = null;
export function fmtSpoken(n: number): string {
  if (!isFinite(n) || n < 1000 || style === 'scientific') return fmt(n);
  if (locale.startsWith('en')) {
    const tier = Math.floor(Math.log10(n) / 3);
    return tier < LONG.length ? trimFixed(n / Math.pow(1000, tier), 2) + ' ' + LONG[tier] : fmt(n);
  }
  try {
    if (n < 1e18) {
      spokenFmt ??= new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 2 });
      return spokenFmt.format(n);
    }
    sciFmt ??= new Intl.NumberFormat(locale, { notation: 'scientific', maximumFractionDigits: 2 });
    return sciFmt.format(n);
  } catch {
    return fmt(n);
  }
}

/** Long form for descriptions: "1.23 million". */
export function fmtLong(n: number): string {
  if (n < 1e6 || style === 'scientific') return n < 1e6 ? Math.floor(n).toLocaleString(locale) : fmt(n);
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= LONG.length) return fmt(n);
  return mark(trimFixed(n / Math.pow(1000, tier), 3)) + ' ' + LONG[tier];
}

/** Rates like "0.1" or "4.5K". */
export function fmtRate(n: number): string {
  return fmt(n, 1);
}

/** A rate for screen readers: as shown below 1000, in words above. */
export function fmtRateSpoken(n: number): string {
  return n < 1000 ? fmtRate(n) : fmtSpoken(n);
}

/** 3h 12m, 4m 05s, 12s. */
export function fmtTime(seconds: number): string {
  seconds = Math.max(0, Math.floor(seconds));
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}${dayUnit} ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

/** A percentage for screen readers: "+200 thousand%" where the screen shows "+200K%". */
export function fmtPercentSpoken(fraction: number): string {
  return fraction * 100 >= 1000 ? fmtSpoken(fraction * 100) + '%' : fmtPercent(fraction);
}

export function fmtPercent(fraction: number): string {
  const pct = fraction * 100;
  if (pct > 0 && pct < 0.1) return mark('<0.1%');
  return (pct >= 100 ? fmt(pct) : mark(trimFixed(pct, 1))) + '%';
}
