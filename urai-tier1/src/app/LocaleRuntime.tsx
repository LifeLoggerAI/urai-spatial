'use client'

import { useEffect } from 'react'
import { negotiateUraiLocale, runtimeUraiLocale, uraiTextDirection } from '@/lib/i18n/locales'

const STORAGE_KEY = 'urai:locale'

export default function LocaleRuntime() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let stored: string | null = null
    try { stored = window.localStorage.getItem(STORAGE_KEY) } catch { /* storage may be unavailable */ }
    const requestedLocale = negotiateUraiLocale({
      explicit: params.get('lang'),
      stored,
      languages: navigator.languages,
    })
    const locale = runtimeUraiLocale(requestedLocale)
    const direction = uraiTextDirection(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = direction
    document.documentElement.dataset.uraiLocale = locale
    document.documentElement.dataset.uraiRequestedLocale = requestedLocale
    document.documentElement.dataset.uraiLocaleReviewRequired = requestedLocale === locale ? 'false' : 'true'
    document.documentElement.dataset.uraiDirection = direction
    try { window.localStorage.setItem(STORAGE_KEY, requestedLocale) } catch { /* fail safely */ }
  }, [])
  return null
}
