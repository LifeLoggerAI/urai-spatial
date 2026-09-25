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
    let activeLocale = requestedLocale()
    applyLocale(activeLocale)

    const root = document.documentElement
    const reconcileRootLocale = () => {
      const direction = localeDirection(activeLocale)
      const nativeReview = localeRequiresNativeReview(activeLocale) ? 'required' : 'source'
      if (root.lang !== activeLocale
        || root.dir !== direction
        || root.dataset.uraiLocale !== activeLocale
        || root.dataset.uraiLocaleDirection !== direction
        || root.dataset.uraiLocaleRuntimeStatus !== URAI_LOCALE_RUNTIME_STATUS
        || root.dataset.uraiLocaleNativeReview !== nativeReview) {
        applyLocale(activeLocale)
      }
    }
    const rootObserver = new MutationObserver(reconcileRootLocale)
    rootObserver.observe(root, {
      attributes: true,
      attributeFilter: ['lang', 'dir', 'data-urai-locale', 'data-urai-locale-direction', 'data-urai-locale-runtime-status', 'data-urai-locale-native-review'],
    })

    const onLocaleChange = (event: Event) => {
      const custom = event as CustomEvent<{ locale?: string }>
      const locale = normalizeLaunchLocale(custom.detail?.locale)
      if (!locale) return
      activeLocale = locale
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
      if (locale) {
        activeLocale = locale
        applyLocale(activeLocale)
      }
    }

    const onConnectivityChange = () => {
      applyLocale(activeLocale)
      window.requestAnimationFrame(() => applyLocale(activeLocale))
    }

    window.addEventListener(LOCALE_EVENT, onLocaleChange)
    window.addEventListener('storage', onStorage)
    window.addEventListener('online', onConnectivityChange)
    window.addEventListener('offline', onConnectivityChange)
    return () => {
      rootObserver.disconnect()
      window.removeEventListener(LOCALE_EVENT, onLocaleChange)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('online', onConnectivityChange)
      window.removeEventListener('offline', onConnectivityChange)
    }
  }, [])

  return null
}

export function requestUraiLocale(locale: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { locale } }))
}
