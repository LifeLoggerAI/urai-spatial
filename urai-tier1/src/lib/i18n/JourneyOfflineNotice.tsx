'use client'

import { useSyncExternalStore } from 'react'
import { useUraiLocale } from './useUraiLocale'

// An unsupported network API is not proof of being offline. The SSR snapshot is
// also online so hydration never manufactures a browser or provider failure.
export function journeyOnlineSnapshot() {
  return typeof window === 'undefined' || window.navigator.onLine !== false
}

export function journeyServerOnlineSnapshot() { return true }

export function subscribeJourneyNetwork(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export default function JourneyOfflineNotice() {
  const online = useSyncExternalStore(subscribeJourneyNetwork, journeyOnlineSnapshot, journeyServerOnlineSnapshot)
  const locale = useUraiLocale()
  if (online) return null
  return <p className="urai-journey-offline" role="status" aria-live="polite" {...locale.props('common.offline')} style={{ margin:0, maxInlineSize:'100%', minInlineSize:0, whiteSpace:'normal', overflowWrap:'anywhere', textAlign:'start' }}>{locale.text('common.offline')}</p>
}
