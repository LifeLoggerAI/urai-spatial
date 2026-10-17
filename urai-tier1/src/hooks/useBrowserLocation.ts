'use client'

import { useSyncExternalStore } from 'react'
import { browserLocationSnapshot, serverLocationSnapshot, subscribeBrowserLocation } from '@/lib/browserLocationStore'

export function useBrowserLocation(): string {
  return useSyncExternalStore(subscribeBrowserLocation, browserLocationSnapshot, serverLocationSnapshot)
}
