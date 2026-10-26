// Translations. Text is looked up by its English wording, so untranslated text
// simply stays in English. Placeholders are written {name} and filled from vars.

import { fmt, setNumberLocale } from '../core/format.js';

export type Lang = 'en' | 'es' | 'pt' | 'fr' | 'de';
export type LangSetting = 'auto' | Lang;

export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch' };

/** Languages chosen automatically from the phone's language. Players can still pick any language in Settings. */
export const AUTO_LANGS: Lang[] = ['es', 'pt', 'fr', 'de'];

const LOCALES: Record<Lang, string> = { en: 'en-US', es: 'es-419', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' };

type Dict = Record<string, string>;

// Each translation is about 70 KB of script, so only the player's language is fetched and parsed
// at start; a low-end phone otherwise spent part of its startup on four languages it never shows.
const LOADERS: Record<Lang, (() => Promise<Dict>) | null> = {
  en: null,
  es: () => import('./es.js').then((m) => m.ES),
  pt: () => import('./pt.js').then((m) => m.PT),
  fr: () => import('./fr.js').then((m) => m.FR),
  de: () => import('./de.js').then((m) => m.DE),
};
const loaded: Partial<Record<Lang, Dict>> = {};

let lang: Lang = 'en';
let numLocale = 'en-US';
let dict: Record<string, string> | null = null;
const missing = new Set<string>();

/** The phone's preferred languages in order (a phone set to Catalan, then Spanish, lists both). */
function deviceLocales(): string[] {
  if (typeof navigator === 'undefined') return [];
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  return list.filter((x): x is string => typeof x === 'string' && x.length >= 2);
}

/** The first of the phone's languages that the game has, or English. */
export function deviceLang(locales: readonly string[] = deviceLocales()): Lang {
  for (const tag of locales) {
    const code = tag.slice(0, 2).toLowerCase();
    if (code === 'en' || (AUTO_LANGS as string[]).includes(code)) return code as Lang;
  }
  return 'en';
}

/** Numbers follow the phone's own region when it speaks the game's language (Spain writes 3,02B,
 *  Latin America 3.02B); otherwise the language's usual region. */
export function numberLocale(game: Lang, locales: readonly string[] = deviceLocales()): string {
  const own = locales.find((tag) => tag.slice(0, 2).toLowerCase() === game);
  if (own) {
    try {
      return Intl.NumberFormat.supportedLocalesOf([own]).length ? own : LOCALES[game];
    } catch {
      return LOCALES[game];
    }
  }
  return LOCALES[game];
}

export function resolveLang(setting: LangSetting, device: Lang = deviceLang()): Lang {
  // A save from a newer version (or an edited one) may name a language this build lacks.
  if (setting !== 'auto' && setting in LOADERS) return setting;
  return AUTO_LANGS.includes(device) ? device : 'en';
}

/** Fetches the translation setLanguage will need. If it cannot be read, the game stays in English. */
export async function loadLanguage(setting: LangSetting): Promise<void> {
  const l = resolveLang(setting);
  const load = LOADERS[l];
  if (!load || loaded[l]) return;
  try {
    loaded[l] = await load();
  } catch (e) {
    console.warn('Translation could not be loaded', l, e);
  }
}

/** Switches language; call loadLanguage first, or the text stays in English. */
export function setLanguage(setting: LangSetting): Lang {
  lang = resolveLang(setting);
  dict = loaded[lang] ?? null;
  if (!dict) lang = 'en';
  numLocale = numberLocale(lang);
  setNumberLocale(numLocale);
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  return lang;
}

export function currentLang(): Lang {
  return lang;
}

export function t(en: string, vars?: Record<string, string | number>): string {
  let out = en;
  if (dict) {
    const hit = dict[en];
    if (hit === undefined) missing.add(en);
    else out = hit;
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
  return out;
}

/**
 * Generated text (such as "Quantum Lunar Base") can't be looked up whole, so
 * data carries a recipe: an English template and its parts. Text parts are
 * translated in turn, numbers are written the local way, and { big } numbers
 * use the game's short form (1.5M).
 */
export type PhraseArg = string | number | { big: number };
export type Phrase = [string, Record<string, PhraseArg>];


export function phrase([tpl, vars]: Phrase): string {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    out[k] = typeof v === 'string' ? t(v) : typeof v === 'number' ? v.toLocaleString(numLocale) : fmt(v.big);
  }
  return t(tpl, out);
}

export interface Named {
  name: string;
  desc: string;
  nameP?: Phrase;
  descP?: Phrase;
}

/** The name in the current language. English always uses the original text. */
export function tName(x: Named): string {
  return dict && x.nameP ? phrase(x.nameP) : t(x.name);
}

export function tDesc(x: Named): string {
  return dict && x.descP ? phrase(x.descP) : t(x.desc);
}

/** English text shown untranslated so far in the current language; for testing coverage. */
export function missingText(): string[] {
  return [...missing];
}
