'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { observeNativeNavigation } from '@/lib/native/nativeDeepLinks'

export default function NativeLinkRuntime() {
  const router = useRouter()
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('App')) return
    let active = true
    let dispose: (() => Promise<void>) | undefined
    void import('@capacitor/app').then(async ({ App }) => {
      const remove = await observeNativeNavigation(App, path => {
        if (window.location.pathname !== path) router.replace(path)
      }, () => active)
      if (active) dispose = remove
      else await remove()
    }).catch(() => {
      // Keep the current route; do not log inbound URLs or provider credentials.
    })
    return () => { active = false; if (dispose) void dispose().catch(() => {}) }
  }, [router])
  return null
}
