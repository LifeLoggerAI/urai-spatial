'use client'

import { getAuth } from 'firebase/auth'
import { doc, getDocFromServer, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import { callOperationalPrivacyFunction } from './operationalPrivacyClient'

export type CanonicalMemoryConsentStatus = 'loading' | 'missing' | 'unavailable' | 'granted' | 'denied' | 'revoked' | 'expired'
export type CanonicalMemoryConsentState = {
  status: CanonicalMemoryConsentStatus
  receiptHash: string | null
  expiresAt: string | null
}
export type CanonicalMemoryConsentWriteStatus = 'granted' | 'revoked'

const UNKNOWN: CanonicalMemoryConsentState = { status: 'unavailable', receiptHash: null, expiresAt: null }
const RECEIPT = /^[0-9a-f]{64}$/
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function canonicalExpiry(value: unknown): string | null {
  if (typeof value !== 'string' || !ISO_UTC.test(value)) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) && new Date(ms).toISOString() === value ? value : null
}

export function parseCanonicalMemoryConsent(value: unknown, uid: string): CanonicalMemoryConsentState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return UNKNOWN
  const record = value as Record<string, unknown>
  if (record.uid !== uid || record.purpose !== 'memory.storage' || record.consentTier !== 'C1'
    || record.policyVersion !== '1.0.0' || typeof record.receiptHash !== 'string'
    || !RECEIPT.test(record.receiptHash)) return UNKNOWN
  if (record.status === 'denied' || record.status === 'revoked') {
    if (record.expiresAt !== null) return UNKNOWN
    return { status: record.status, receiptHash: record.receiptHash, expiresAt: null }
  }
  if (record.status !== 'granted') return UNKNOWN
  const expiresAt = canonicalExpiry(record.expiresAt)
  if (!expiresAt) return UNKNOWN
  return { status: Date.parse(expiresAt) > Date.now() ? 'granted' : 'expired', receiptHash: record.receiptHash, expiresAt }
}

function memoryConsentRef(uid: string) {
  return doc(getFirebaseDb(), 'consentRecords', `${uid}_memory_storage`)
}

function sameOwner(uid: string) {
  return firebasePublicEnvReady && getAuth(app).currentUser?.uid === uid
}

/** A Firestore cache entry is never represented as a live C1 authorization. */
export function watchCanonicalMemoryConsent(
  uid: string,
  onState: (state: CanonicalMemoryConsentState) => void,
): Unsubscribe {
  if (!sameOwner(uid)) {
    onState(UNKNOWN)
    return () => undefined
  }
  let active = true
  let failed = false
  let expiryTimer: ReturnType<typeof setTimeout> | null = null
  const clearExpiry = () => {
    if (expiryTimer !== null) clearTimeout(expiryTimer)
    expiryTimer = null
  }
  // Server-confirmed grants expire even if no further Firestore snapshot arrives.
  // UI state alone is never permission to perform a governed operation.
  const publish = (state: CanonicalMemoryConsentState) => {
    clearExpiry()
    if (!active || failed || !sameOwner(uid)) return
    if (state.status !== 'granted' || !state.expiresAt) {
      onState(state)
      return
    }
    const deadline = Date.parse(state.expiresAt)
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      onState({ ...state, status: 'expired' })
      return
    }
    onState(state)
    const recheck = () => {
      expiryTimer = null
      if (!active || failed || !sameOwner(uid)) return
      const remaining = deadline - Date.now()
      if (remaining <= 0) {
        onState({ ...state, status: 'expired' })
        return
      }
      // Timers cannot reliably represent delays longer than 2^31 - 1 ms.
      expiryTimer = setTimeout(recheck, Math.min(remaining, 2_147_483_647))
    }
    recheck()
  }
  try {
    const stop = onSnapshot(memoryConsentRef(uid), { includeMetadataChanges: true }, (snapshot) => {
      if (!active || failed || !sameOwner(uid)) return
      if (snapshot.metadata?.fromCache !== false || snapshot.metadata?.hasPendingWrites !== false) {
        publish(UNKNOWN)
        return
      }
      publish(snapshot.exists() ? parseCanonicalMemoryConsent(snapshot.data(), uid) : {
        status: 'missing', receiptHash: null, expiresAt: null,
      })
    }, () => {
      if (!active) return
      failed = true
      clearExpiry()
      onState(UNKNOWN)
    })
    return () => { active = false; clearExpiry(); stop() }
  } catch {
    failed = true
    clearExpiry()
    onState(UNKNOWN)
    return () => { active = false; clearExpiry() }
  }
}

/** This must be an explicit owner action; never call from an effect or onboarding default. */
export async function requestCanonicalMemoryConsent(
  uid: string,
  status: CanonicalMemoryConsentWriteStatus,
): Promise<CanonicalMemoryConsentState> {
  if (!sameOwner(uid)) throw new Error('CANONICAL_C1_AUTH_REQUIRED')
  const response = await callOperationalPrivacyFunction('setCanonicalConsent', {
    purpose: 'memory.storage', status, surface: 'urai-consent-sanctuary',
  })
  if (!sameOwner(uid)) throw new Error('CANONICAL_C1_OWNER_CHANGED')
  const expectedId = `${uid}_memory_storage`
  if (response.consentId !== expectedId || response.status !== status || response.consentTier !== 'C1'
    || response.policyVersion !== '1.0.0' || typeof response.receiptHash !== 'string'
    || !RECEIPT.test(response.receiptHash)) throw new Error('CANONICAL_C1_RECEIPT_INVALID')
  // A callable response alone is not a server-observed authorization. Require a
  // matching owner-scoped Firestore record read from the server, never cache.
  const snapshot = await getDocFromServer(memoryConsentRef(uid))
  if (!sameOwner(uid)) throw new Error('CANONICAL_C1_OWNER_CHANGED')
  const result = snapshot.exists() ? parseCanonicalMemoryConsent(snapshot.data(), uid) : UNKNOWN
  if (result.status !== status || result.receiptHash !== response.receiptHash) {
    throw new Error('CANONICAL_C1_SERVER_RECEIPT_NOT_CONFIRMED')
  }
  return result
}
