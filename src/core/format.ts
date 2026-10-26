// Number and time formatting for the UI. Numbers are plain doubles.

const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

const LONG = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion', 'duodecillion', 'tredecillion', 'quattuordecillion', 'quindecillion', 'sexdecillion', 'septendecillion', 'octodecillion', 'novemdecillion', 'vigintillion'];

export type NumberStyle = 'short' | 'scientific';

let style: NumberStyle = 'short';

export function setNumberStyle(s: NumberStyle): void {
  style = s;
}

// Most of Europe and Brazil write 2,5 for two and a half; the locale itself says which mark it uses.
let locale = 'en-US';
let comma = false;
// Hours, minutes and seconds are the same symbols everywhere; the day is "j" (jour) in French and
// "T" (Tag) in German.
let dayUnit = 'd';

export function setNumberLocale(tag: string): void {
  locale = tag;
  spokenFmt = sciFmt = null;
  try {
    comma = new Intl.NumberFormat(tag).format(1.5).includes(',');
  } catch {
    comma = tag.startsWith('pt') || tag.startsWith('fr') || tag.startsWith('de');
  }
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

// Number words from 10^15 up, where Intl's compact form runs out ("300.000 Billionen") and its
// scientific form is read as "3 E 21". Index is the power of 1000. German, French and Spanish count
// in the long scale (Billion = 10^12); Brazilian Portuguese in the short scale (bilhão = 10^9).
// Each entry is [one, many]; Spanish says 10^(6n+3) as "mil" plus the plural of the step below.
const LONG_SCALE: Record<string, Array<[string, string]>> = {
  de: ['Billiarde', 'Trillion', 'Trilliarde', 'Quadrillion', 'Quadrilliarde', 'Quintillion', 'Quintilliarde', 'Sextillion', 'Sextilliarde', 'Septillion', 'Septilliarde', 'Oktillion', 'Oktilliarde', 'Nonillion', 'Nonilliarde', 'Dezillion', 'Dezilliarde']
    .map((w) => [w, w.endsWith('e') ? w + 'n' : w + 'en']),
  fr: ['billiard', 'trillion', 'trilliard', 'quadrillion', 'quadrilliard', 'quintillion', 'quintilliard', 'sextillion', 'sextilliard', 'septillion', 'septilliard', 'octillion', 'octilliard', 'nonillion', 'nonilliard', 'décillion', 'décilliard']
    .map((w) => [w, w + 's']),
  es: [
    ['mil billones', 'mil billones'], ['trillón', 'trillones'], ['mil trillones', 'mil trillones'], ['cuatrillón', 'cuatrillones'],
    ['mil cuatrillones', 'mil cuatrillones'], ['quintillón', 'quintillones'], ['mil quintillones', 'mil quintillones'],
    ['sextillón', 'sextillones'], ['mil sextillones', 'mil sextillones'], ['septillón', 'septillones'],
    ['mil septillones', 'mil septillones'], ['octillón', 'octillones'], ['mil octillones', 'mil octillones'],
    ['nonillón', 'nonillones'], ['mil nonillones', 'mil nonillones'], ['decillón', 'decillones'], ['mil decillones', 'mil decillones'],
  ],
  pt: ['quatrilhão', 'quintilhão', 'sextilhão', 'septilhão', 'octilhão', 'nonilhão', 'decilhão', 'undecilhão', 'duodecilhão', 'tredecilhão', 'quatuordecilhão', 'quindecilhão', 'sexdecilhão', 'septendecilhão', 'octodecilhão', 'novendecilhão', 'vigintilhão']
    .map((w) => [w, w.replace(/ão$/, 'ões')]),
};

/**
 * The same number for screen readers, which read "14.41Qa" letter by letter: "14.41 quadrillion" in
 * English, and the local word elsewhere ("14,41 Billionen", "3,2 Trilliarden").
 */
let spokenFmt: Intl.NumberFormat | null = null;
let sciFmt: Intl.NumberFormat | null = null;
// Scientific form read aloud ("1.44e16" is otherwise read as "1.44 e 16").
const TIMES_TEN: Record<string, string> = { en: 'times ten to the', de: 'mal zehn hoch', fr: 'fois dix puissance', es: 'por diez elevado a', pt: 'vezes dez elevado a' };

export function fmtSpoken(n: number): string {
  if (!isFinite(n) || n < 1000) return fmt(n);
  if (style === 'scientific' || Math.floor(Math.log10(n) / 3) >= SHORT.length) {
    const exp = Math.floor(Math.log10(n));
    const mant = Number((n / Math.pow(10, exp)).toFixed(2));
    return `${mant.toLocaleString(locale, { maximumFractionDigits: 2 })} ${TIMES_TEN[locale.slice(0, 2)] ?? TIMES_TEN.en} ${exp}`;
  }
  if (locale.startsWith('en')) {
    const tier = Math.floor(Math.log10(n) / 3);
    return tier < LONG.length ? trimFixed(n / Math.pow(1000, tier), 2) + ' ' + LONG[tier] : fmt(n);
  }
  try {
    const tier = Math.floor(Math.log10(n) / 3);
    const words = LONG_SCALE[locale.slice(0, 2)];
    if (tier < 5 || !words) {
      spokenFmt ??= new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 2 });
      if (tier < 5) return spokenFmt.format(n);
    } else if (tier - 5 < words.length) {
      const scaled = Number((n / Math.pow(1000, tier)).toFixed(2));
      const [one, many] = words[tier - 5];
      return scaled.toLocaleString(locale, { maximumFractionDigits: 2 }) + ' ' + (scaled === 1 ? one : many);
    }
    sciFmt ??= new Intl.NumberFormat(locale, { notation: 'scientific', maximumFractionDigits: 2 });
    return sciFmt.format(n);
  } catch {
    return fmt(n);
  }
}

// Short-form numbers inside finished text: "+4.95B Stardust", "12,4K". A suffix followed by a digit
// is left alone, since German writes days as "2T 04h".
const SHORT_IN_TEXT = new RegExp(`(\\d+(?:[.,]\\d+)?)(${[...SHORT].filter(Boolean).sort((a, b) => b.length - a.length).join('|')})(?![A-Za-z])(?!\\s*\\d)`, 'g');

/** Text with every short-form number in words, or null when there is none. */
export function spokenShortText(text: string): string | null {
  let found = false;
  const out = text.replace(SHORT_IN_TEXT, (m, num: string, suffix: string) => {
    const n = parseFloat(num.replace(',', '.')) * Math.pow(1000, SHORT.indexOf(suffix));
    if (!isFinite(n)) return m;
    found = true;
    return fmtSpoken(n);
  }).replace(/\b(\d+(?:[.,]\d+)?)e(\d+)\b/g, (m, num: string, exp: string) => {
    // Scientific form ("1.44e16"), from the scientific number setting or past the last suffix.
    const n = parseFloat(num.replace(',', '.')) * Math.pow(10, Number(exp));
    if (!isFinite(n)) return m;
    found = true;
    return fmtSpoken(n);
  });
  return found ? out : null;
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
  return fraction * 100 >= 1e6 ? fmtSpoken(fraction * 100) + '%' : fmtPercent(fraction);
}

export function fmtPercent(fraction: number): string {
  const pct = fraction * 100;
  if (pct > 0 && pct < 0.1) return mark('<0.1%');
  // Bonuses past 1,000% read as whole numbers ("+1,930%"), not "+1.93K%".
  if (pct >= 1000 && pct < 1e6) return Math.floor(pct).toLocaleString(locale) + '%';
  return (pct >= 100 ? fmt(pct) : mark(trimFixed(pct, 1))) + '%';
}
