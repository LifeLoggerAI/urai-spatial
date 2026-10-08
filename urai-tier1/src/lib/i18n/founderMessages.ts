import type { UraiCatalog, UraiLaunchLocale, UraiMessageDefinition } from './locales'
import { URAI_FOUNDER_TRANSLATIONS } from './founderTranslations'

// Review catalogs are preparation only. Privacy disclosure uses the admitted
// runtime locale and English fallback; no translation grants language acceptance.
export const URAI_FOUNDER_MESSAGES = {
  'founder.disclosure': {
    id: 'founder.disclosure',
    source: 'Founder digital presence',
    sensitivity: 'privacy',
    description: 'Persistent visible disclosure that Adam is a digital Founder presence, not the live human founder',
  },
} as const satisfies Record<string, UraiMessageDefinition>

export const URAI_FOUNDER_CATALOGS: Record<UraiLaunchLocale, UraiCatalog> = {
  ...URAI_FOUNDER_TRANSLATIONS,
  en: { 'founder.disclosure': URAI_FOUNDER_MESSAGES['founder.disclosure'].source },
}
