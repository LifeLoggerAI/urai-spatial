'use client'

import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useRouter, useSearchParams } from 'next/navigation'
import { app, firebasePublicEnvReady, functions, getFirebaseDb } from '@/lib/firebase/client'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import {
  capturedRealityBrowserCapability,
  capturedRealityDeviceTier,
  CAPTURED_REALITY_QUALITY_PROFILES,
} from '@/spatial/captured-reality/capturedRealityRuntime'
import {
  capturedRealityContentLengthAvailable,
  capturedRealityWebGL2Available,
} from '@/spatial/captured-reality/capturedRealityDelivery'
import InterpretiveWorldScene from '@/spatial/interpretive-world/InterpretiveWorldScene'
import type { InterpretiveWorldRenderDecision } from '@/spatial/interpretive-world/interpretiveWorld'

type AssetMetadata = {
  assetId: string
  label: string
  truthClass: string
  truthLabel: string
  state: string
  reviewState: string
  visualAcceptance: string
  releaseState: string
  browserCertified: boolean
  mobileCertified: boolean
  collisionArtifactId: string | null
  autobiographical: false
  sourceTruthEligible: false
  sourceCount: 0
}

type RuntimeDelivery = {
  assetId: string
  deviceTier: 'desktop' | 'mobile'
  url: string
  expiresAt: string
  truthLabel: string
  autobiographical: false
  collisionArtifactId: string | null
}

const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/

function suppressedDecision(label = 'Interpretive generated world unavailable'): InterpretiveWorldRenderDecision {
  return {
    mode: 'suppressed',
    reasons: ['INTERPRETIVE_WORLD_RUNTIME_UNAVAILABLE'],
    truthLabel: label,
    assetUrl: null,
    collisionArtifactId: null,
    autobiographical: false,
    allowedSourceIds: [],
    embodiedMovementAllowed: false,
  }
}

function splatDecision(delivery: RuntimeDelivery): InterpretiveWorldRenderDecision {
  return {
    mode: 'interpretive-gaussian-splat',
    reasons: [],
    truthLabel: delivery.truthLabel,
    assetUrl: delivery.url,
    collisionArtifactId: delivery.collisionArtifactId,
    autobiographical: false,
    allowedSourceIds: [],
    embodiedMovementAllowed: delivery.collisionArtifactId !== null,
  }
}

function assetAuthorityActive(snapshot: { exists(): boolean; get(field: string): unknown }, uid: string, deviceTier: 'desktop' | 'mobile') {
  if (!snapshot.exists() || snapshot.get('ownerId') !== uid) return false
  const sourceIds = snapshot.get('sourceIds')
  const releaseState = String(snapshot.get('releaseState') ?? '')
  const activeRelease = ['private-pilot', 'private-beta', 'launch-enabled'].includes(releaseState)
  const revoked = snapshot.get('revokedAt') != null
    || snapshot.get('revocationState') === 'revoked'
    || snapshot.get('state') === 'revoked'

  const certified = deviceTier === 'mobile'
    ? snapshot.get('mobileCertified') === true
    : snapshot.get('browserCertified') === true

  return !revoked
    && activeRelease
    && certified
    && snapshot.get('state') === 'ready'
    && snapshot.get('reviewState') === 'accepted'
    && snapshot.get('visualAcceptance') === 'accepted'
    && snapshot.get('truthClass') === 'interpretive'
    && snapshot.get('autobiographical') === false
    && snapshot.get('generatedOnly') === true
    && snapshot.get('sourceTruthEligible') === false
    && Array.isArray(sourceIds)
    && sourceIds.length === 0
    && snapshot.get('exactPrivateLocationEmbedded') === false
}

function browserPrerequisites() {
  return {
    webgl2: capturedRealityWebGL2Available(),
    webWorker: typeof Worker !== 'undefined',
    readableStream: typeof ReadableStream !== 'undefined',
  }
}

async function contentLengthAvailable(url: string, signal?: AbortSignal) {
  const tier = capturedRealityDeviceTier(navigator.userAgent)
  return capturedRealityContentLengthAvailable(url, CAPTURED_REALITY_QUALITY_PROFILES[tier].maxRuntimeBytes, signal)
}

async function loadMetadata(assetId: string) {
  const callable = httpsCallable<{ assetId: string }, AssetMetadata>(functions, 'getInterpretiveWorldAsset')
  return (await callable({ assetId })).data
}

async function loadDelivery(assetId: string) {
  const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
  const callable = httpsCallable<{ assetId: string; deviceTier: 'desktop' | 'mobile' }, RuntimeDelivery>(
    functions,
    'getInterpretiveWorldRuntimeUrl',
  )
  return (await callable({ assetId, deviceTier })).data
}

export default function InterpretiveWorldRouteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawAssetId = searchParams.get('assetId') ?? ''
  const assetId = SAFE_ASSET_ID.test(rawAssetId) ? rawAssetId : null
  const reducedMotion = useReducedMotion()
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [decision, setDecision] = useState<InterpretiveWorldRenderDecision>(() => suppressedDecision())
  const [message, setMessage] = useState('Opening interpretive world…')
  const revokedRef = useRef(false)
  const truthLabelRef = useRef<string | undefined>(undefined)
  const renewedDeliveryRef = useRef<RuntimeDelivery | null>(null)

  const exit = useCallback(() => {
    revokedRef.current = true
    renewedDeliveryRef.current = null
    setDecision(suppressedDecision(truthLabelRef.current))
    if (window.history.length > 1) router.back()
    else router.push('/replay')
  }, [router])

  const suppress = useCallback((nextMessage: string) => {
    revokedRef.current = true
    renewedDeliveryRef.current = null
    truthLabelRef.current = undefined
    setDecision(suppressedDecision())
    setMessage(nextMessage)
  }, [])

  useEffect(() => {
    if (!assetId) {
      setUser(null)
      setMessage('This interpretive-world link is invalid.')
      return
    }
    if (!firebasePublicEnvReady) {
      setUser(null)
      setMessage('Generated-world identity authority is unavailable.')
      return
    }

    return onAuthStateChanged(getAuth(app), (nextUser) => {
      revokedRef.current = true
      renewedDeliveryRef.current = null
      truthLabelRef.current = undefined
      setDecision(suppressedDecision())
      setUser(nextUser)
      setMessage(nextUser ? 'Opening interpretive world…' : 'Sign in to open this interpretive world.')
    })
  }, [assetId])

  useEffect(() => {
    if (!user || !assetId) return

    revokedRef.current = false
    setMessage('Opening interpretive world…')
    let disposed = false
    const identityCurrent = () => getAuth(app).currentUser?.uid === user.uid
    const abort = new AbortController()
    const stops: Unsubscribe[] = []

    let resolveAuthority!: (active: boolean) => void
    const authority = new Promise<boolean>((resolve) => { resolveAuthority = resolve })
    let firstSnapshot = true
    const authorityTimeout = window.setTimeout(() => {
      if (firstSnapshot) {
        firstSnapshot = false
        resolveAuthority(false)
      }
    }, 15_000)

    const db = getFirebaseDb()
    const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
    stops.push(onSnapshot(
      doc(db, 'users', user.uid, 'interpretiveWorldAssets', assetId),
      (snapshot) => {
        const active = assetAuthorityActive(snapshot, user.uid, deviceTier)
        if (firstSnapshot) {
          firstSnapshot = false
          window.clearTimeout(authorityTimeout)
          resolveAuthority(active)
        }
        if (!active && !disposed) {
          abort.abort()
          suppress('This interpretive world closed because its release or review authority changed.')
        }
      },
      () => {
        if (firstSnapshot) {
          firstSnapshot = false
          window.clearTimeout(authorityTimeout)
          resolveAuthority(false)
        }
        if (!disposed) suppress('This interpretive world closed because its authority could not be observed.')
      },
    ))

    void (async () => {
      try {
        if (!(await authority)) {
          suppress('This interpretive world is not currently authorized for runtime.')
          return
        }
        if (disposed || revokedRef.current || !identityCurrent()) return

        const metadata = await loadMetadata(assetId)
        if (disposed || revokedRef.current || !identityCurrent()) return
        if (
          metadata.truthClass !== 'interpretive'
          || metadata.autobiographical !== false
          || metadata.sourceTruthEligible !== false
          || metadata.sourceCount !== 0
        ) {
          suppress('This generated world failed its truth boundary.')
          return
        }

        truthLabelRef.current = metadata.truthLabel
        const prerequisites = browserPrerequisites()
        if (!prerequisites.webgl2 || !prerequisites.webWorker || !prerequisites.readableStream) {
          const capability = capturedRealityBrowserCapability({
            ...prerequisites,
            contentLengthAvailable: true,
          })
          suppress(capability.missing.join(', ') || 'Spatial rendering is unavailable.')
          return
        }

        const delivery = await loadDelivery(assetId)
        if (disposed || revokedRef.current || !identityCurrent()) return
        if (delivery.autobiographical !== false) {
          suppress('This generated world failed its runtime truth boundary.')
          return
        }

        const hasLength = await contentLengthAvailable(delivery.url, abort.signal)
        if (disposed || revokedRef.current || !identityCurrent()) return
        const capability = capturedRealityBrowserCapability({
          ...prerequisites,
          contentLengthAvailable: hasLength,
        })
        if (!capability.supported) {
          suppress(capability.missing.join(', '))
          return
        }

        renewedDeliveryRef.current = delivery
        setDecision(splatDecision(delivery))
        setMessage('Interpretive world ready.')
      } catch {
        if (disposed || revokedRef.current || abort.signal.aborted || !identityCurrent()) return
        suppress('This interpretive world could not be opened.')
      }
    })()

    return () => {
      disposed = true
      window.clearTimeout(authorityTimeout)
      abort.abort()
      for (const stop of stops) stop()
    }
  }, [assetId, suppress, user])

  useEffect(() => {
    if (!user || !assetId || decision.mode !== 'interpretive-gaussian-splat' || !renewedDeliveryRef.current) return
    let cancelled = false
    let timer: number | null = null
    let activeAbort: AbortController | null = null
    const identityCurrent = () => getAuth(app).currentUser?.uid === user.uid

    const scheduleRenewal = (delivery: RuntimeDelivery) => {
      const expires = Date.parse(delivery.expiresAt)
      if (!Number.isFinite(expires)) {
        suppress('This interpretive world closed because its delivery expiry was invalid.')
        return
      }
      const refreshIn = Math.max(5_000, expires - Date.now() - 60_000)
      timer = window.setTimeout(() => {
        void (async () => {
          const renewalAbort = new AbortController()
          activeAbort = renewalAbort
          try {
            const next = await loadDelivery(assetId)
            if (cancelled || revokedRef.current || !identityCurrent()) return
            if (next.autobiographical !== false) throw new Error('truth boundary changed')

            const prerequisites = browserPrerequisites()
            const hasLength = await contentLengthAvailable(next.url, renewalAbort.signal)
            if (cancelled || revokedRef.current || !identityCurrent()) return
            const capability = capturedRealityBrowserCapability({ ...prerequisites, contentLengthAvailable: hasLength })
            if (!capability.supported) throw new Error('browser capability changed')

            renewedDeliveryRef.current = next
            setDecision(splatDecision(next))
            scheduleRenewal(next)
          } catch {
            if (!cancelled && !renewalAbort.signal.aborted && identityCurrent()) {
              suppress('This interpretive world closed because its authorized delivery could not be renewed.')
            }
          }
        })()
      }, refreshIn)
    }

    scheduleRenewal(renewedDeliveryRef.current)

    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      activeAbort?.abort()
    }
  }, [assetId, decision.mode, suppress, user])

  return (
    <main
      data-testid="interpretive-world-route"
      data-state={user === undefined ? 'auth-loading' : decision.mode}
      data-autobiographical="false"
      style={{ minHeight: '100svh', background: '#05070b', color: '#f7f7f5' }}
    >
      {user && decision.mode === 'interpretive-gaussian-splat'
        ? <InterpretiveWorldScene decision={decision} reducedMotion={reducedMotion} onExit={exit} />
        : (
          <section style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
            <div>
              <p>{message}</p>
              <button type="button" onClick={exit}>Return to Replay</button>
              <AdamLauncherSlot name="interpretive-world-fallback" as="div" />
            </div>
          </section>
        )}
    </main>
  )
}
