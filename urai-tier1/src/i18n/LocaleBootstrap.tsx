'use client'

import { useEffect } from 'react'
import {
  URAI_DEFAULT_LOCALE,
  URAI_LOCALE_RUNTIME_STATUS,
  localeDirection,
  localeRequiresNativeReview,
  normalizeLaunchLocale,
  resolveLaunchLocale,
  type UraiLaunchLocale,
} from './localeRegistry'

const STORAGE_KEY = 'urai.locale'
const LOCALE_EVENT = 'urai:locale-change'

function requestedLocale(): UraiLaunchLocale {
  if (typeof window === 'undefined') return URAI_DEFAULT_LOCALE

  const params = new URLSearchParams(window.location.search)
  const queryLocale = normalizeLaunchLocale(params.get('lang'))
  if (queryLocale) return queryLocale

  try {
    const stored = normalizeLaunchLocale(window.localStorage.getItem(STORAGE_KEY))
    if (stored) return stored
  } catch {
    // Locale selection must never blank the product when storage is unavailable.
  }

  return resolveLaunchLocale(navigator.languages?.length ? navigator.languages : [navigator.language])
}

function applyLocale(locale: UraiLaunchLocale) {
  const root = document.documentElement
  const direction = localeDirection(locale)
  root.lang = locale
  root.dir = direction
  root.dataset.uraiLocale = locale
  root.dataset.uraiLocaleDirection = direction
  root.dataset.uraiLocaleRuntimeStatus = URAI_LOCALE_RUNTIME_STATUS
  root.dataset.uraiLocaleNativeReview = localeRequiresNativeReview(locale) ? 'required' : 'source'
}

export default function LocaleBootstrap() {
  useEffect(() => {
    const initial = requestedLocale()
    applyLocale(initial)

    const onLocaleChange = (event: Event) => {
      const custom = event as CustomEvent<{ locale?: string }>
      const locale = normalizeLaunchLocale(custom.detail?.locale)
      if (!locale) return
      try {
        window.localStorage.setItem(STORAGE_KEY, locale)
      } catch {
        // Runtime direction/lang still updates even when persistence is blocked.
      }
      applyLocale(locale)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const locale = normalizeLaunchLocale(event.newValue)
      if (locale) applyLocale(locale)
    }

    window.addEventListener(LOCALE_EVENT, onLocaleChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocaleChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return null
}

export function requestUraiLocale(locale: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { locale } }))
}
