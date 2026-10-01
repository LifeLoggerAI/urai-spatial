export const URAI_LAUNCH_LOCALES = [
  'en','zh-Hans','hi','es','fr','ar','bn','pt-BR','ru','ur',
  'id','de','ja','sw','tr','vi','fil','ko','it','fa',
] as const

export type UraiLaunchLocale = typeof URAI_LAUNCH_LOCALES[number]
export type UraiTextDirection = 'ltr' | 'rtl'

export const URAI_RTL_LOCALES = new Set<UraiLaunchLocale>(['ar','ur','fa'])

const BASE_LANGUAGE: Partial<Record<string, UraiLaunchLocale>> = {
  zh: 'zh-Hans',
  pt: 'pt-BR',
}

export function isUraiLaunchLocale(value: string | null | undefined): value is UraiLaunchLocale {
  return Boolean(value && URAI_LAUNCH_LOCALES.includes(value as UraiLaunchLocale))
}

export function normalizeUraiLocale(value: string | null | undefined): UraiLaunchLocale | null {
  if (!value) return null
  const candidate = value.trim().replace('_','-')
  if (isUraiLaunchLocale(candidate)) return candidate
  const lower = candidate.toLowerCase()
  const exact = URAI_LAUNCH_LOCALES.find(locale => locale.toLowerCase() === lower)
  if (exact) return exact
  const base = lower.split('-')[0]
  if (BASE_LANGUAGE[base]) return BASE_LANGUAGE[base]!
  const launchBase = URAI_LAUNCH_LOCALES.find(locale => locale.toLowerCase() === base)
  return launchBase ?? null
}

export function negotiateUraiLocale(input: {
  explicit?: string | null
  stored?: string | null
  languages?: readonly string[]
}): UraiLaunchLocale {
  for (const candidate of [input.explicit, input.stored, ...(input.languages ?? [])]) {
    const locale = normalizeUraiLocale(candidate)
    if (locale) return locale
  }
  return 'en'
}

export function uraiTextDirection(locale: UraiLaunchLocale): UraiTextDirection {
  return URAI_RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
}

export type UraiMessageSensitivity = 'general' | 'legal' | 'privacy' | 'consent' | 'payment' | 'safety' | 'clinical'

export type UraiMessageDefinition = {
  id: string
  source: string
  sensitivity: UraiMessageSensitivity
  description: string
}

export const URAI_SOURCE_MESSAGES = {
  'nav.home': { id:'nav.home', source:'Home', sensitivity:'general', description:'Canonical Home navigation label' },
  'nav.lifeMap': { id:'nav.lifeMap', source:'Life Map', sensitivity:'general', description:'Canonical Life Map navigation label' },
  'nav.focus': { id:'nav.focus', source:'Focus', sensitivity:'general', description:'Canonical Focus navigation label' },
  'nav.replay': { id:'nav.replay', source:'Replay', sensitivity:'general', description:'Canonical Replay navigation label' },
  'common.loading': { id:'common.loading', source:'Loading…', sensitivity:'general', description:'Generic bounded loading state' },
  'common.unavailable': { id:'common.unavailable', source:'This experience is temporarily unavailable.', sensitivity:'general', description:'Generic fail-closed unavailable state' },
  'privacy.reviewRequired': { id:'privacy.reviewRequired', source:'Native review required', sensitivity:'privacy', description:'Machine-prepared localization review marker' },
} as const satisfies Record<string,UraiMessageDefinition>

export type UraiMessageId = keyof typeof URAI_SOURCE_MESSAGES
export type UraiCatalog = Partial<Record<UraiMessageId,string>>

// English is the only human-authoritative source catalog. Other locales remain
// machine-preparation-only until a native reviewer explicitly supplies/approves
// strings; critical copy must not silently masquerade as approved localization.
export const URAI_CATALOGS: Record<UraiLaunchLocale,UraiCatalog> = Object.fromEntries(
  URAI_LAUNCH_LOCALES.map(locale => [locale, locale === 'en'
    ? Object.fromEntries(Object.entries(URAI_SOURCE_MESSAGES).map(([id,definition]) => [id,definition.source]))
    : {}]),
) as Record<UraiLaunchLocale,UraiCatalog>

export function messageFor(locale: UraiLaunchLocale, id: UraiMessageId) {
  return URAI_CATALOGS[locale][id] ?? URAI_CATALOGS.en[id] ?? URAI_SOURCE_MESSAGES[id].source
}

export function localizationCompleteness(locale: UraiLaunchLocale) {
  const total = Object.keys(URAI_SOURCE_MESSAGES).length
  const translated = Object.keys(URAI_CATALOGS[locale]).length
  return { locale, translated, total, complete: translated === total, nativeReviewRequired: locale !== 'en' }
}

export function formatUraiDate(locale: UraiLaunchLocale, value: Date | number | string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value))
}

export function formatUraiNumber(locale: UraiLaunchLocale, value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatUraiList(locale: UraiLaunchLocale, values: string[], options: Intl.ListFormatOptions = {}) {
  return new Intl.ListFormat(locale, options).format(values)
}
