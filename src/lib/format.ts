/**
 * Locale-aware number formatting (PLAN §4.4). Italian uses a decimal comma (5,36 TeV).
 * Scientific notation is shown with Unicode superscripts: 1e12 → "10¹²", 3.6e-6 → "3.6 × 10⁻⁶".
 */
import { NUMBER_LOCALE, type Lang } from '../i18n';

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export const superscript = (s: string | number) => String(s).replace(/[-0-9]/g, (c) => SUP[c]);

export function formatNumber(lang: Lang, n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang], opts).format(n);
}

/**
 * formatSci('en', 1e12) → "10¹²"; formatSci('it', 5.36e3, {digits: 3}) → "5,36 × 10³".
 * Numbers between 1e-3 and 1e5 are formatted plainly unless `force` is set.
 */
export function formatSci(lang: Lang, n: number, { digits = 2, force = false }: { digits?: number; force?: boolean } = {}): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (!force && abs >= 1e-3 && abs < 1e5) return formatNumber(lang, n, { maximumSignificantDigits: digits + 1 });
  const exp = Math.floor(Math.log10(abs));
  const mant = n / 10 ** exp;
  const pow = `10${superscript(exp)}`;
  if (Math.abs(mant - Math.round(mant)) < 1e-9 && Math.round(Math.abs(mant)) === 1) return (n < 0 ? '−' : '') + pow;
  return `${formatNumber(lang, mant, { maximumFractionDigits: digits })} × ${pow}`;
}
