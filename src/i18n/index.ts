// Translations. Text is looked up by its English wording, so untranslated text
// simply stays in English. Placeholders are written {name} and filled from vars.

import { ES } from './es.js';
import { PT } from './pt.js';

export type Lang = 'en' | 'es' | 'pt';
export type LangSetting = 'auto' | Lang;

export const LANG_NAMES: Record<Lang, string> = { en: 'English', es: 'Español', pt: 'Português' };

/**
 * Languages chosen automatically from the phone's language. Spanish and
 * Portuguese join once every screen is translated; until then players pick
 * them in Settings.
 */
export const AUTO_LANGS: Lang[] = [];

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

/** English text shown untranslated so far in the current language; for testing coverage. */
export function missingText(): string[] {
  return [...missing];
}
