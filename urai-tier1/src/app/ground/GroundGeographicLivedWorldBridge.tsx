'use client'

import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { defaultConsentPolicy, isConsentPolicy, type ConsentPolicy } from '@/app/privacy-controls/consentModel'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import { LOCATION_CONSENT_KEY, LOCATION_PINS_KEY, parsePins, type GeographicMemoryPin } from '@/spatial/places/geographicLocationVault'
import type { ConsentDecisionSnapshot, LivedWorldGraph, LivedWorldSource, PlaceEntity } from '@/spatial/lived-world/livedWorldGraph'

const GRAPH_SESSION_KEY = 'urai:lived-world:graph:v1'
const CONSENT_SESSION_KEY = 'urai:lived-world:consent:v1'
const BRIDGE_POLICY_PREFIX = 'geographic-vault:'

function dispatch(name: 'urai:lived-world-graph-changed' | 'urai:lived-world-consent-changed') {
  window.dispatchEvent(new Event(name))
}

function safeSessionJson<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

function clearBridgeGraph() {
  const existing = safeSessionJson<LivedWorldGraph>(GRAPH_SESSION_KEY)
  if (existing?.sourcePolicyVersion?.startsWith(BRIDGE_POLICY_PREFIX)) {
    try { window.sessionStorage.removeItem(GRAPH_SESSION_KEY) } catch { /* fail closed in-memory */ }
    dispatch('urai:lived-world-graph-changed')
  }
}

function setLocationConsent(snapshot: ConsentDecisionSnapshot | null) {
  const existing = safeSessionJson<Record<string, ConsentDecisionSnapshot>>(CONSENT_SESSION_KEY) ?? {}
  const next = { ...existing }
  if (snapshot) next['location.context'] = snapshot
  else delete next['location.context']
  try {
    if (Object.keys(next).length) window.sessionStorage.setItem(CONSENT_SESSION_KEY, JSON.stringify(next))
    else window.sessionStorage.removeItem(CONSENT_SESSION_KEY)
  } catch { /* session authority remains absent on storage failure */ }
  dispatch('urai:lived-world-consent-changed')
}

function precisionConfidence(pin: GeographicMemoryPin) {
  if (pin.precision === 'exact-private') return .72
  if (pin.precision === 'approximate') return .58
  return .42
}

function buildGraph(ownerId: string, pins: GeographicMemoryPin[], policy: ConsentPolicy): LivedWorldGraph {
  const sources: Record<string, LivedWorldSource> = {}
  const entities: Record<string, PlaceEntity> = {}
  const exactPolicyAllowed = policy.domains.location.precise

  for (const pin of pins) {
    const sourceId = `geo-pin-source:${pin.id}`
    const entityId = `place:${pin.id}`
    const exactAllowed = exactPolicyAllowed && pin.precision === 'exact-private'
    const precision = exactAllowed ? 'exact-private' : pin.precision === 'city' ? 'city' : 'approximate'
    sources[sourceId] = {
      id: sourceId,
      provenance: 'user-confirmed',
      sourceType: 'device-location',
      sourceTime: pin.createdAt,
      capturedAt: pin.createdAt,
      locator: `local-geographic-pin:${pin.id}`,
      transformations: [
        'browser-geolocation-requested-by-user',
        `stored-precision:${precision}`,
        'user-supplied-readable-place-label',
      ],
    }
    entities[entityId] = {
      id: entityId,
      kind: 'place',
      label: pin.title || pin.readablePlace || 'Authorized place',
      placeType: 'other',
      geographicPrecision: precision,
      buildingIds: [],
      routeIds: [],
      eraIds: [],
      sourceIds: [sourceId],
      semanticImportance: .5,
      reconstruction: {
        fidelity: 'partial',
        confidence: precisionConfidence(pin),
        sourceIds: [sourceId],
        visibility: 'private',
        userCorrectionRevision: 0,
        lastConfirmedAt: pin.createdAt,
        privacy: {
          requiredPurposes: ['location.context'],
          consentTiers: ['C3'],
          thirdPartyPresent: false,
          exactLocationAllowed: exactAllowed,
          biometricIdentityAllowed: false,
          sensitiveInferenceAllowed: false,
          publicContributionAllowed: false,
        },
      },
    }
  }

  return {
    schemaVersion: 'urai-lived-world-1',
    ownerId,
    generatedAt: new Date().toISOString(),
    sourcePolicyVersion: `${BRIDGE_POLICY_PREFIX}privacy-v2-revision-${policy.revision}`,
    sources,
    entities,
    edges: [],
  }
}

function localLocationAuthorized() {
  try { return window.localStorage.getItem(LOCATION_CONSENT_KEY) === 'granted' } catch { return false }
}

function localPins() {
  try { return parsePins(window.localStorage.getItem(LOCATION_PINS_KEY)) } catch { return [] }
}

/**
 * Reuses the existing Geographic Location vault. It performs no location request,
 * no background collection and no network map lookup. It only converts already
 * saved, currently authorized local pins into partial private place anchors.
 */
export default function GroundGeographicLivedWorldBridge() {
  const userRef = useRef<User | null>(null)
  const policyRef = useRef<ConsentPolicy | null>(null)

  useEffect(() => {
    if (!firebasePublicEnvReady) {
      clearBridgeGraph()
      setLocationConsent(null)
      return
    }

    let policyUnsubscribe: (() => void) | null = null

    const reconcile = () => {
      const user = userRef.current
      const policy = policyRef.current
      const locationOpen = Boolean(policy && policy.domains.location.mode !== 'denied' && policy.domains.location.mode !== 'paused')
      if (!user || !policy || !locationOpen || !localLocationAuthorized()) {
        clearBridgeGraph()
        setLocationConsent(null)
        return
      }
      const pins = localPins()
      if (!pins.length) {
        clearBridgeGraph()
        setLocationConsent({ purpose: 'location.context', tier: 'C3', status: 'granted', policyVersion: `privacy-v2-revision-${policy.revision}`, evaluatedAt: new Date().toISOString() })
        return
      }
      const graph = buildGraph(user.uid, pins, policy)
      try { window.sessionStorage.setItem(GRAPH_SESSION_KEY, JSON.stringify(graph)) } catch {
        clearBridgeGraph()
        setLocationConsent(null)
        return
      }
      setLocationConsent({ purpose: 'location.context', tier: 'C3', status: 'granted', policyVersion: `privacy-v2-revision-${policy.revision}`, evaluatedAt: new Date().toISOString() })
      dispatch('urai:lived-world-graph-changed')
    }

    const authUnsubscribe = onAuthStateChanged(getAuth(app), (user) => {
      userRef.current = user
      policyRef.current = null
      policyUnsubscribe?.()
      policyUnsubscribe = null
      if (!user) {
        reconcile()
        return
      }
      const policyDocument = doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current')
      policyUnsubscribe = onSnapshot(policyDocument, (snapshot) => {
        const raw = snapshot.data()
        policyRef.current = snapshot.exists() && isConsentPolicy(raw, user.uid) ? raw : defaultConsentPolicy(user.uid)
        reconcile()
      }, () => {
        policyRef.current = null
        reconcile()
      })
    })

    const storageListener = (event: StorageEvent) => {
      if (event.key === LOCATION_CONSENT_KEY || event.key === LOCATION_PINS_KEY) reconcile()
    }
    window.addEventListener('storage', storageListener)

    return () => {
      authUnsubscribe()
      policyUnsubscribe?.()
      window.removeEventListener('storage', storageListener)
    }
  }, [])

  return null
}
