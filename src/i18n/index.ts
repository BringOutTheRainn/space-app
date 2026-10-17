// Translations. Text is looked up by its English wording, so untranslated text
// simply stays in English. Placeholders are written {name} and filled from vars.

import { ES } from './es.js';
import { PT } from './pt.js';
import { fmt, setNumberLocale } from '../core/format.js';

export type Lang = 'en' | 'es' | 'pt';
export type LangSetting = 'auto' | Lang;

export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español', pt: 'Português' };

/** Languages chosen automatically from the phone's language. Players can still pick any language in Settings. */
export const AUTO_LANGS: Lang[] = ['es', 'pt'];

const LOCALES: Record<Lang, string> = { en: 'en-US', es: 'es-419', pt: 'pt-BR' };

const DICTS: Record<Lang, Record<string, string> | null> = { en: null, es: ES, pt: PT };

let lang: Lang = 'en';
let dict: Record<string, string> | null = null;
const missing = new Set<string>();

export function deviceLang(): Lang {
  const code = (typeof navigator === 'undefined' ? 'en' : navigator.language || 'en').slice(0, 2).toLowerCase();
  return code === 'es' ? 'es' : code === 'pt' ? 'pt' : 'en';
}

export function resolveLang(setting: LangSetting, device: Lang = deviceLang()): Lang {
  if (setting !== 'auto') return setting;
  return AUTO_LANGS.includes(device) ? device : 'en';
}

export function setLanguage(setting: LangSetting): Lang {
  lang = resolveLang(setting);
  dict = DICTS[lang];
  setNumberLocale(LOCALES[lang]);
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
    out[k] = typeof v === 'string' ? t(v) : typeof v === 'number' ? v.toLocaleString(LOCALES[lang]) : fmt(v.big);
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
