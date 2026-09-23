export const URAI_LAUNCH_LOCALES = [
  'en',
  'zh-Hans',
  'hi',
  'es',
  'fr',
  'ar',
  'bn',
  'pt-BR',
  'ru',
  'ur',
  'id',
  'de',
  'ja',
  'sw',
  'tr',
  'vi',
  'fil',
  'ko',
  'it',
  'fa',
] as const

export type UraiLaunchLocale = (typeof URAI_LAUNCH_LOCALES)[number]
export type UraiTextDirection = 'ltr' | 'rtl'

export const URAI_DEFAULT_LOCALE: UraiLaunchLocale = 'en'
export const URAI_RTL_LOCALES = new Set<UraiLaunchLocale>(['ar', 'ur', 'fa'])

const EXACT = new Set<string>(URAI_LAUNCH_LOCALES)

const BASE_ALIASES: Record<string, UraiLaunchLocale> = {
  en: 'en',
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  hi: 'hi',
  es: 'es',
  fr: 'fr',
  ar: 'ar',
  bn: 'bn',
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  ru: 'ru',
  ur: 'ur',
  id: 'id',
  de: 'de',
  ja: 'ja',
  sw: 'sw',
  tr: 'tr',
  vi: 'vi',
  fil: 'fil',
  tl: 'fil',
  ko: 'ko',
  it: 'it',
  fa: 'fa',
}

export function normalizeLaunchLocale(value: string | null | undefined): UraiLaunchLocale | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (EXACT.has(raw)) return raw as UraiLaunchLocale
  const lower = raw.toLowerCase()
  if (BASE_ALIASES[lower]) return BASE_ALIASES[lower]
  const base = lower.split('-')[0]
  return BASE_ALIASES[base] ?? null
}

export function resolveLaunchLocale(candidates: readonly string[]): UraiLaunchLocale {
  for (const candidate of candidates) {
    const normalized = normalizeLaunchLocale(candidate)
    if (normalized) return normalized
  }
  return URAI_DEFAULT_LOCALE
}

export function localeDirection(locale: UraiLaunchLocale): UraiTextDirection {
  return URAI_RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
}

export function localeRequiresNativeReview(locale: UraiLaunchLocale): boolean {
  return locale !== 'en'
}

export const URAI_LOCALE_RUNTIME_STATUS = 'machine-preparation-only' as const
