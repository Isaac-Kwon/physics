/**
 * UI strings + locale helpers (PLAN §4.4).
 * Strings live in src/i18n/<lang>/<area>.json — one file per area so parallel work never edits the same file:
 *   core.json (site-wide), chrome.json (header/footer/hub), scrolly.json (scroll engine), connections.json, scenes.json …
 * English is the source of truth; ko/it may be partial and fall back to en, then to the key itself.
 */
import { DEFAULT_LANG, LANGS, isLang, type Lang } from '../data/topics';

export type UIKey = string;
const files = import.meta.glob<Record<string, string>>('./*/*.json', { eager: true, import: 'default' });
const dicts = Object.fromEntries(LANGS.map((l) => [l, {} as Record<string, string>])) as Record<Lang, Record<string, string>>;
for (const [path, dict] of Object.entries(files)) {
  const lang = path.split('/')[1];
  if (isLang(lang)) Object.assign(dicts[lang], dict);
}

/** t('ko')('nav.glossary') — supports {name} placeholders. */
export function useT(lang: Lang) {
  return (key: UIKey, vars?: Record<string, string | number>): string => {
    let s = dicts[lang][key] ?? dicts[DEFAULT_LANG][key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English', it: 'Italiano' };
export const LANG_SHORT: Record<Lang, string> = { ko: 'KO', en: 'EN', it: 'IT' };
export const HTML_LANG: Record<Lang, string> = { ko: 'ko', en: 'en', it: 'it' };
export const NUMBER_LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', it: 'it-IT' };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // "/physics"

/** Prefix an absolute site path with the deploy base: withBase('/en/') → '/physics/en/'. */
export function withBase(path: string): string {
  if (/^https?:/.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Localized path: localizePath('ko', '/heavy-ion/#collision') → '/physics/ko/heavy-ion/#collision'. */
export function localizePath(lang: Lang, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return withBase(`/${lang}${p}`);
}

/** Language from a URL pathname (with or without base). */
export function getLangFromUrl(url: URL): Lang {
  const rest = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
  const seg = rest.split('/').filter(Boolean)[0];
  return isLang(seg) ? seg : DEFAULT_LANG;
}

/** Path without base and language: '/physics/ko/heavy-ion/' → '/heavy-ion/'. Used for hreflang + language switch. */
export function stripLang(url: URL): string {
  const rest = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
  const parts = rest.split('/').filter(Boolean);
  if (isLang(parts[0])) parts.shift();
  return `/${parts.join('/')}${parts.length ? '/' : ''}`;
}

export { LANGS, DEFAULT_LANG, type Lang };
