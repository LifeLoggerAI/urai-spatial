export const URAI_LAUNCH_LOCALES = [
  'en', 'zh-Hans', 'hi', 'es', 'fr', 'ar', 'bn', 'pt-BR', 'ru', 'ur',
  'id', 'de', 'ja', 'sw', 'tr', 'vi', 'fil', 'ko', 'it', 'fa',
] as const;

export type UraiLocale = (typeof URAI_LAUNCH_LOCALES)[number];
export type UraiDirection = 'ltr' | 'rtl';

export const URAI_RTL_LOCALES = new Set<UraiLocale>(['ar', 'ur', 'fa']);
export const URAI_DEFAULT_LOCALE: UraiLocale = 'en';
export const URAI_LOCALE_STORAGE_KEY = 'urai.locale.v1';

export const URAI_LOCALE_META: Record<UraiLocale, { direction: UraiDirection; nativeName: string; review: 'baseline' | 'rtl-specialist' }> = {
  en: { direction: 'ltr', nativeName: 'English', review: 'baseline' },
  'zh-Hans': { direction: 'ltr', nativeName: '简体中文', review: 'baseline' },
  hi: { direction: 'ltr', nativeName: 'हिन्दी', review: 'baseline' },
  es: { direction: 'ltr', nativeName: 'Español', review: 'baseline' },
  fr: { direction: 'ltr', nativeName: 'Français', review: 'baseline' },
  ar: { direction: 'rtl', nativeName: 'العربية', review: 'rtl-specialist' },
  bn: { direction: 'ltr', nativeName: 'বাংলা', review: 'baseline' },
  'pt-BR': { direction: 'ltr', nativeName: 'Português (Brasil)', review: 'baseline' },
  ru: { direction: 'ltr', nativeName: 'Русский', review: 'baseline' },
  ur: { direction: 'rtl', nativeName: 'اردو', review: 'rtl-specialist' },
  id: { direction: 'ltr', nativeName: 'Bahasa Indonesia', review: 'baseline' },
  de: { direction: 'ltr', nativeName: 'Deutsch', review: 'baseline' },
  ja: { direction: 'ltr', nativeName: '日本語', review: 'baseline' },
  sw: { direction: 'ltr', nativeName: 'Kiswahili', review: 'baseline' },
  tr: { direction: 'ltr', nativeName: 'Türkçe', review: 'baseline' },
  vi: { direction: 'ltr', nativeName: 'Tiếng Việt', review: 'baseline' },
  fil: { direction: 'ltr', nativeName: 'Filipino', review: 'baseline' },
  ko: { direction: 'ltr', nativeName: '한국어', review: 'baseline' },
  it: { direction: 'ltr', nativeName: 'Italiano', review: 'baseline' },
  fa: { direction: 'rtl', nativeName: 'فارسی', review: 'rtl-specialist' },
};

const aliases: Record<string, UraiLocale> = {
  zh: 'zh-Hans', 'zh-cn': 'zh-Hans', 'zh-sg': 'zh-Hans',
  pt: 'pt-BR', 'pt-br': 'pt-BR',
  'in': 'id',
  tl: 'fil',
  fa: 'fa', 'fa-ir': 'fa',
  ur: 'ur', 'ur-pk': 'ur',
  ar: 'ar',
};

export function isUraiLocale(value: string | null | undefined): value is UraiLocale {
  return Boolean(value && (URAI_LAUNCH_LOCALES as readonly string[]).includes(value));
}

export function normalizeUraiLocale(value: string | null | undefined): UraiLocale | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (isUraiLocale(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  if (aliases[lower]) return aliases[lower];
  const base = lower.split('-')[0];
  if (aliases[base]) return aliases[base];
  const exact = URAI_LAUNCH_LOCALES.find(locale => locale.toLowerCase() === lower);
  if (exact) return exact;
  const baseMatch = URAI_LAUNCH_LOCALES.find(locale => locale.toLowerCase().split('-')[0] === base);
  return baseMatch ?? null;
}

export function resolveUraiLocale(candidates: Array<string | null | undefined>): UraiLocale {
  for (const candidate of candidates) {
    const normalized = normalizeUraiLocale(candidate);
    if (normalized) return normalized;
  }
  return URAI_DEFAULT_LOCALE;
}

export function directionForLocale(locale: UraiLocale): UraiDirection {
  return URAI_LOCALE_META[locale].direction;
}

export function formatNumber(locale: UraiLocale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(locale: UraiLocale, value: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function formatList(locale: UraiLocale, values: string[], options?: Intl.ListFormatOptions): string {
  return new Intl.ListFormat(locale, options).format(values);
}
