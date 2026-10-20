'use client'

import { useSyncExternalStore } from 'react'
import { currentLocalePreference, displayLocale, localeDate, localeNumber, localizedMessage, serverLocalePreference, subscribeLocale, updateLocalePreference, writeLocalePreference, type LocalePreference } from './localePreference'
import { uraiTextDirection, type UraiLaunchLocale, type UraiMessageId } from './locales'

export function useUraiLocale() {
  const preference = useSyncExternalStore(subscribeLocale, currentLocalePreference, serverLocalePreference)
  const locale = displayLocale(preference)
  const setPreference = (next: LocalePreference) => {
    updateLocalePreference(next)
    try { writeLocalePreference(window.localStorage, next) } catch { /* in-memory preference remains usable */ }
  }
  return {
    preference, locale,
    text: (id: UraiMessageId, values?: Record<string,string>) => localizedMessage(preference, id, values).text,
    props: (id: UraiMessageId) => {
      const message = localizedMessage(preference, id)
      return {lang:message.locale, dir:message.direction, 'data-urai-translation-preview':String(message.preview)}
    },
    formatProps: {lang:locale, dir:uraiTextDirection(locale)},
    number: (value: number, options?: Intl.NumberFormatOptions) => localeNumber(preference, value, options),
    date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => localeDate(preference, value, options),
    choose: (requested: UraiLaunchLocale) => {
      setPreference({requested, preview:false})
      const url = new URL(window.location.href)
      url.searchParams.set('lang', requested)
      window.history.replaceState(window.history.state, '', url)
    },
    preview: (preview: boolean) => setPreference({...preference, preview}),
  }
}
