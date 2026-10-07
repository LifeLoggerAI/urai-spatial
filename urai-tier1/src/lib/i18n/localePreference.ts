import { formatUraiDate, formatUraiNumber, messageFor, negotiateUraiLocale, normalizeUraiLocale, runtimeUraiLocale, URAI_CATALOGS, URAI_SOURCE_MESSAGES, uraiTextDirection, type UraiLaunchLocale, type UraiMessageId } from './locales'

export const URAI_LOCALE_STORAGE_KEY = 'urai:locale'
export const URAI_LOCALE_PREVIEW_STORAGE_KEY = 'urai:locale-preview'
export type LocalePreference = Readonly<{requested: UraiLaunchLocale; preview: boolean}>
export const ENGLISH_LOCALE_PREFERENCE: LocalePreference = Object.freeze({requested:'en', preview:false})
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function readLocalePreference(input: {storage?: StorageLike; search?: string; languages?: readonly string[]}): LocalePreference {
  let stored: string | null = null
  let preview = false
  try {
    stored = input.storage?.getItem(URAI_LOCALE_STORAGE_KEY) ?? null
    preview = input.storage?.getItem(URAI_LOCALE_PREVIEW_STORAGE_KEY) === normalizeUraiLocale(stored)
  } catch { /* readable English is available without storage */ }
  const params = new URLSearchParams(input.search)
  const explicit = normalizeUraiLocale(params.get('lang'))
  const requested = negotiateUraiLocale({explicit, stored, languages:input.languages})
  // A different URL preference must not inherit another language's preview choice.
  if (requested !== normalizeUraiLocale(stored)) preview = false
  return {requested, preview}
}

export function writeLocalePreference(storage: StorageLike | undefined, preference: LocalePreference): boolean {
  try {
    storage?.setItem(URAI_LOCALE_STORAGE_KEY, preference.requested)
    storage?.setItem(URAI_LOCALE_PREVIEW_STORAGE_KEY, preference.preview ? preference.requested : 'false')
    return Boolean(storage)
  } catch { return false }
}

export function displayLocale(preference: LocalePreference): UraiLaunchLocale {
  return preference.preview ? preference.requested : runtimeUraiLocale(preference.requested)
}

export function localizedMessage(preference: LocalePreference, id: UraiMessageId, values: Record<string, string> = {}) {
  const definition = URAI_SOURCE_MESSAGES[id]
  const candidate = definition.sensitivity === 'general' ? displayLocale(preference) : runtimeUraiLocale(preference.requested)
  const translated = URAI_CATALOGS[candidate][id]
  const locale = translated ? candidate : 'en'
  const text = (translated ?? messageFor('en', id)).replace(/\{([a-zA-Z]+)\}/g, (placeholder, name) => values[name] ?? placeholder)
  return {text, locale, direction:uraiTextDirection(locale), preview:locale !== runtimeUraiLocale(preference.requested)}
}

const SPEECH_TAGS: Record<UraiLaunchLocale, string> = {
  en:'en-US', 'zh-Hans':'zh-CN', hi:'hi-IN', es:'es-ES', fr:'fr-FR', ar:'ar-SA', bn:'bn-BD', 'pt-BR':'pt-BR', ru:'ru-RU', ur:'ur-PK',
  id:'id-ID', de:'de-DE', ja:'ja-JP', sw:'sw-KE', tr:'tr-TR', vi:'vi-VN', fil:'fil-PH', ko:'ko-KR', it:'it-IT', fa:'fa-IR',
}
export function speechTagFor(preference: LocalePreference) { return SPEECH_TAGS[displayLocale(preference)] }

let current: LocalePreference = ENGLISH_LOCALE_PREFERENCE
const subscribers = new Set<() => void>()
export function subscribeLocale(listener: () => void) { subscribers.add(listener); return () => { subscribers.delete(listener) } }
export function currentLocalePreference() { return current }
export function serverLocalePreference() { return ENGLISH_LOCALE_PREFERENCE }
export function updateLocalePreference(preference: LocalePreference) {
  preference = {requested:normalizeUraiLocale(preference.requested) ?? 'en', preview:preference.preview === true && Boolean(normalizeUraiLocale(preference.requested))}
  if (preference.requested === current.requested && preference.preview === current.preview) return
  current = Object.freeze({...preference})
  for (const listener of subscribers) listener()
}
export function currentSpeechTag() { return speechTagFor(current) }
export function localeDate(preference: LocalePreference, value: Date | number | string, options: Intl.DateTimeFormatOptions = {}) { return formatUraiDate(displayLocale(preference), value, options) }
export function localeNumber(preference: LocalePreference, value: number, options: Intl.NumberFormatOptions = {}) { return formatUraiNumber(displayLocale(preference), value, options) }
