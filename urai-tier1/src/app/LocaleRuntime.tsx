'use client'

import { useEffect } from 'react'
import { runtimeUraiLocale, uraiTextDirection } from '@/lib/i18n/locales'
import { currentLocalePreference, readLocalePreference, subscribeLocale, updateLocalePreference, writeLocalePreference } from '@/lib/i18n/localePreference'

export default function LocaleRuntime() {
  useEffect(() => {
    const synchronize = () => {
      const preference = currentLocalePreference()
      const locale = runtimeUraiLocale(preference.requested)
      const direction = uraiTextDirection(locale)
      // Scoped general controls may preview; the mixed document retains its
      // admitted language for sensitive and not-yet-localized English copy.
      document.documentElement.lang = locale
      document.documentElement.dir = direction
      document.documentElement.dataset.uraiLocale = locale
      document.documentElement.dataset.uraiRequestedLocale = preference.requested
      document.documentElement.dataset.uraiLocaleReviewRequired = preference.requested === locale ? 'false' : 'true'
      document.documentElement.dataset.uraiLocalePreview = String(preference.preview)
      document.documentElement.dataset.uraiDirection = direction
    }
    const read = () => {
      let storage: Storage | undefined
      try { storage = window.localStorage } catch { /* storage unavailable */ }
      const preference = readLocalePreference({storage, search:window.location.search, languages:navigator.languages})
      updateLocalePreference(preference)
      writeLocalePreference(storage, preference)
      synchronize()
    }
    const unsubscribe = subscribeLocale(synchronize)
    read()
    window.addEventListener('storage', read)
    window.addEventListener('languagechange', read)
    window.addEventListener('popstate', read)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', read)
      window.removeEventListener('languagechange', read)
      window.removeEventListener('popstate', read)
    }
  }, [])
  return null
}
