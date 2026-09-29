'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export type NativeGoogleOAuthResult = 'connected' | 'denied' | 'invalid-state' | 'error'

const GOOGLE_RETURN_ORIGIN = 'https://urai.app'
const GOOGLE_RETURN_PATH = '/settings'
const ALLOWED_RESULTS = new Set<NativeGoogleOAuthResult>(['connected', 'denied', 'invalid-state', 'error'])

export function isNativeUrAiRuntime() {
  return Capacitor.isNativePlatform()
}

export async function openNativeGoogleAuthorization(authorizationUrl: string) {
  if (!isNativeUrAiRuntime()) return false
  const parsed = new URL(authorizationUrl)
  if (parsed.origin !== 'https://accounts.google.com') {
    throw new Error('Native Google authorization must stay on accounts.google.com.')
  }
  await Browser.open({ url: parsed.toString() })
  return true
}

function parseGoogleReturn(rawUrl: string): NativeGoogleOAuthResult | null {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.origin !== GOOGLE_RETURN_ORIGIN) return null
    if (parsed.pathname !== GOOGLE_RETURN_PATH && parsed.pathname !== `${GOOGLE_RETURN_PATH}/`) return null
    const result = parsed.searchParams.get('google') as NativeGoogleOAuthResult | null
    return result && ALLOWED_RESULTS.has(result) ? result : null
  } catch {
    return null
  }
}

export async function registerNativeGoogleOAuthReturn(
  onResult: (result: NativeGoogleOAuthResult) => void,
) {
  if (!isNativeUrAiRuntime()) return async () => {}

  const handle = async (rawUrl: string) => {
    const result = parseGoogleReturn(rawUrl)
    if (!result) return
    await Browser.close().catch(() => {})
    if (window.location.pathname !== GOOGLE_RETURN_PATH && window.location.pathname !== `${GOOGLE_RETURN_PATH}/`) {
      window.location.assign(`${GOOGLE_RETURN_PATH}?google=${encodeURIComponent(result)}`)
      return
    }
    onResult(result)
  }

  const listener = await App.addListener('appUrlOpen', ({ url }) => {
    void handle(url)
  })

  const launch = await App.getLaunchUrl().catch(() => undefined)
  if (launch?.url) await handle(launch.url)

  return async () => {
    await listener.remove()
  }
}
