'use client'

import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useRouter, useSearchParams } from 'next/navigation'
import { app, firebasePublicEnvReady, functions, getFirebaseDb } from '@/lib/firebase/client'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import CapturedRealityPrivateScene from '@/spatial/captured-reality/CapturedRealityPrivateScene'
import {
  capturedRealityBrowserCapability,
  capturedRealityDeviceTier,
  CAPTURED_REALITY_QUALITY_PROFILES,
} from '@/spatial/captured-reality/capturedRealityRuntime'
import {
  capturedRealityContentLengthAvailable, capturedRealityWebGL2Available,
  validateCapturedRealityRuntimeDelivery,
  type CapturedRealityRuntimeDelivery, type CapturedRealityStreamAuthority,
} from '@/spatial/captured-reality/capturedRealityDelivery'
import { capturedRealityJourneyReturnHref } from '@/spatial/captured-reality/capturedRealityJourney'
import type { CapturedRealityRenderDecision } from '@/spatial/captured-reality/capturedReality'
import { useCapturedRealityReplayLookup } from '@/spatial/captured-reality/useCapturedRealityReplayEntry'
import { sanitizeMemoryId } from '@/spatial/memory/selectedMemoryContract'

type AssetMetadata = {
  assetId: string
  label: string
  truthClass: string
  state: string
  reconstructionMethod: string
  reviewState: string
  sourceCount: number
  truthLabel: string
  createdAt: unknown
  updatedAt: unknown
}

type RuntimeDelivery = CapturedRealityRuntimeDelivery

type RouteState =
  | { kind: 'auth-loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'fallback'; message: string }
  | { kind: 'suppressed'; message: string }
  | { kind: 'error'; message: string }

function suppressedDecision(label = 'Private captured place unavailable'): CapturedRealityRenderDecision {
  return {
    mode: 'suppressed',
    reasons: ['PRIVATE_RUNTIME_UNAVAILABLE'],
    truthLabel: label,
    assetUrl: null,
    fallbackMeshArtifactId: null,
    collisionArtifactId: null,
    allowedSourceIds: [],
    autobiographical: false,
  }
}

function fallbackDecision(label: string): CapturedRealityRenderDecision {
  return {
    mode: 'generic-fallback',
    reasons: ['BROWSER_CAPABILITY_FALLBACK'],
    truthLabel: label,
    assetUrl: null,
    fallbackMeshArtifactId: null,
    collisionArtifactId: null,
    allowedSourceIds: [],
    autobiographical: false,
  }
}

function splatDecision(delivery: RuntimeDelivery): CapturedRealityRenderDecision {
  return {
    mode: 'gaussian-splat',
    reasons: [],
    truthLabel: delivery.truthLabel,
    assetUrl: delivery.url,
    fallbackMeshArtifactId: null,
    collisionArtifactId: null,
    allowedSourceIds: [],
    autobiographical: true,
  }
}

function policyMode(snapshot: { get(field: string): unknown }, field: 'memory' | 'location') {
  return String(snapshot.get(`domains.${field}.mode`) ?? 'denied')
}

function modeAllowed(mode: string) {
  return mode === 'granted' || mode === 'limited'
}

function policyAuthorityActive(snapshot: { get(field: string): unknown }, uid: string) {
  const revision = snapshot.get('revision')
  return snapshot.get('ownerId') === uid && snapshot.get('version') === 2
    && typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 1
    && snapshot.get('enforcement.state') === 'fully-enforced'
}

function assetAuthorityActive(snapshot: { exists(): boolean; get(field: string): unknown }, uid: string, accessMode: 'runtime' | 'proof') {
  if (!snapshot.exists() || snapshot.get('ownerId') !== uid) return false
  const state = String(snapshot.get('state') ?? '')
  const releaseState = String(snapshot.get('releaseState') ?? '')
  const activeRelease = ['private-pilot', 'private-beta', 'launch-enabled'].includes(releaseState)
  const explicitlyRevoked = snapshot.get('revokedAt') != null
    || snapshot.get('revocationState') === 'revoked'
    || snapshot.get('state') === 'revoked'
  if (explicitlyRevoked || !activeRelease) return false
  if (accessMode === 'runtime') {
    return state === 'ready' && snapshot.get('reviewState') === 'accepted'
  }
  return (state === 'proof-ready' || state === 'ready')
    && snapshot.get('proofState') === 'technical-preview'
    && snapshot.get('proofIntegrityVerified') === true
    && snapshot.get('proofPrivacyReviewed') === true
}

function localBrowserPrerequisites() {
  return {
    webgl2: capturedRealityWebGL2Available(),
    webWorker: typeof Worker !== 'undefined',
    readableStream: typeof ReadableStream !== 'undefined',
  }
}

async function contentLengthAvailable(delivery: RuntimeDelivery, requestHeaders: CapturedRealityStreamAuthority['requestHeaders'], signal?: AbortSignal) {
  const tier = capturedRealityDeviceTier(navigator.userAgent)
  return capturedRealityContentLengthAvailable(delivery.url, CAPTURED_REALITY_QUALITY_PROFILES[tier].maxRuntimeBytes, signal, fetch, {
    requestHeaders, expectedSha256: delivery.runtimeSha256, expectedByteLength: delivery.runtimeByteLength,
  })
}

async function loadAssetMetadata(assetId: string) {
  const callable = httpsCallable<{ assetId: string }, AssetMetadata>(functions, 'getCapturedRealityAsset')
  const result = await callable({ assetId })
  return result.data
}

async function loadRuntimeDelivery(assetId: string, accessMode: 'runtime' | 'proof') {
  const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
  const callable = httpsCallable<{ assetId: string; deviceTier: 'desktop' | 'mobile'; accessMode: 'runtime' | 'proof' }, RuntimeDelivery>(functions, 'getCapturedRealityRuntimeUrl')
  const result = await callable({ assetId, deviceTier, accessMode })
  if (!validateCapturedRealityRuntimeDelivery(result.data, {
    assetId, accessMode, deviceTier, projectId: app.options.projectId ?? '', maxRuntimeBytes: CAPTURED_REALITY_QUALITY_PROFILES[deviceTier].maxRuntimeBytes,
  })) throw new Error('PRIVATE_DELIVERY_DESCRIPTOR_INVALID')
  return result.data
}

const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/

export default function CapturedRealityRouteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawAssetId = searchParams.get('assetId') ?? ''
  const assetId = SAFE_ASSET_ID.test(rawAssetId) ? rawAssetId : null
  const accessMode: 'runtime' | 'proof' = searchParams.get('proof') === '1' ? 'proof' : 'runtime'
  const rawMemoryId = searchParams.get('memoryId')
  const memoryId = sanitizeMemoryId(rawMemoryId)
  const replayWithdrawal = useRef<() => void>(() => {})
  const replayLookup = useCapturedRealityReplayLookup(memoryId, () => replayWithdrawal.current())
  const memoryEntryActive = rawMemoryId === null || (Boolean(memoryId) && replayLookup.status === 'available' && replayLookup.entry?.assetId === assetId)
  const returnHref = capturedRealityJourneyReturnHref(memoryId)
  const reducedMotion = useReducedMotion()
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [metadata, setMetadata] = useState<AssetMetadata | null>(null)
  const [delivery, setDelivery] = useState<RuntimeDelivery | null>(null)
  const [decision, setDecision] = useState<CapturedRealityRenderDecision>(() => suppressedDecision())
  const [state, setState] = useState<RouteState>({ kind: 'auth-loading' })
  const [showProvenance, setShowProvenance] = useState(false)
  const revokedRef = useRef(false)
  const truthLabelRef = useRef<string | undefined>(undefined)
  const renewedDeliveryRef = useRef<RuntimeDelivery | null>(null)
  const activeLoadAbort = useRef<AbortController | null>(null)

  const exit = useCallback(() => {
    // Revoke before scheduling navigation: a pending callable may resolve while
    // the router is still leaving and must not reopen the private scene.
    revokedRef.current = true
    setShowProvenance(false)
    setMetadata(null)
    setDelivery(null)
    renewedDeliveryRef.current = null
    setDecision(suppressedDecision(truthLabelRef.current))
    router.push(returnHref)
  }, [router, returnHref])

  const requestHeaders = useCallback(async () => {
    const current = getAuth(app).currentUser
    if (!current || current !== user || revokedRef.current) throw new Error('PRIVATE_IDENTITY_UNAVAILABLE')
    const token = await current.getIdToken()
    if (getAuth(app).currentUser !== current || revokedRef.current) throw new Error('PRIVATE_IDENTITY_CHANGED')
    return { Authorization: `Bearer ${token}` }
  }, [user])

  const streamAuthority = useMemo<CapturedRealityStreamAuthority | undefined>(() => delivery ? {
    requestHeaders, expectedSha256: delivery.runtimeSha256, expectedByteLength: delivery.runtimeByteLength,
  } : undefined, [delivery, requestHeaders])

  const suppress = useCallback((message: string) => {
    revokedRef.current = true
    setDelivery(null)
    renewedDeliveryRef.current = null
    setMetadata(null)
    truthLabelRef.current = undefined
    setShowProvenance(false)
    setDecision(suppressedDecision())
    setState({ kind: 'suppressed', message })
  }, [])
  replayWithdrawal.current = () => {
    activeLoadAbort.current?.abort()
    suppress('Captured Reality closed because the selected Replay memory is unavailable.')
  }

  useEffect(() => {
    if (!assetId) {
      setUser(null)
      setState({ kind: 'error', message: 'This private captured place link is invalid.' })
      return
    }
    if (!firebasePublicEnvReady) {
      setUser(null)
      setState({ kind: 'error', message: 'Private identity authority is unavailable.' })
      return
    }
    return onAuthStateChanged(getAuth(app), (nextUser) => {
      revokedRef.current = true
      setDelivery(null)
      renewedDeliveryRef.current = null
      setMetadata(null)
      truthLabelRef.current = undefined
      setShowProvenance(false)
      setDecision(suppressedDecision())
      setUser(nextUser)
      setState({ kind: nextUser ? 'loading' : 'unauthenticated' })
    })
  }, [assetId])

  useEffect(() => {
    if (!user || !assetId) return
    if (!memoryEntryActive) {
      suppress('Captured Reality closed because the selected Replay memory is unavailable.')
      return
    }

    revokedRef.current = false
    setState({ kind: 'loading' })
    setDelivery(null)

    let disposed = false
    const identityCurrent = () => getAuth(app).currentUser === user
    const abort = new AbortController()
    activeLoadAbort.current = abort
    const stops: Unsubscribe[] = []

    const stopForPrivacy = (message: string) => {
      if (disposed) return
      abort.abort()
      if (activeLoadAbort.current === abort) activeLoadAbort.current = null
      suppress(message)
    }

    const db = getFirebaseDb()
    let resolveAssetAuthority!: (active: boolean) => void
    const assetAuthority = new Promise<boolean>((resolve) => { resolveAssetAuthority = resolve })
    let firstAssetSnapshot = true
    const assetAuthorityTimeout = window.setTimeout(() => {
      if (firstAssetSnapshot) {
        firstAssetSnapshot = false
        resolveAssetAuthority(false)
      }
    }, 15_000)
    stops.push(onSnapshot(
      doc(db, 'users', user.uid, 'capturedRealityAssets', assetId),
      (snapshot) => {
        const active = assetAuthorityActive(snapshot, user.uid, accessMode)
        if (firstAssetSnapshot) {
          firstAssetSnapshot = false
          window.clearTimeout(assetAuthorityTimeout)
          resolveAssetAuthority(active)
        }
        if (!active) stopForPrivacy('Captured Reality closed because this asset is unavailable or revoked.')
      },
      () => {
        if (firstAssetSnapshot) {
          firstAssetSnapshot = false
          window.clearTimeout(assetAuthorityTimeout)
          resolveAssetAuthority(false)
        }
        stopForPrivacy('Captured Reality closed because asset authority could not be observed.')
      },
    ))
    stops.push(onSnapshot(
      doc(db, 'users', user.uid, 'privacyPolicy', 'current'),
      (snapshot) => {
        const memoryMode = policyMode(snapshot, 'memory')
        const locationMode = policyMode(snapshot, 'location')
        if (!policyAuthorityActive(snapshot, user.uid) || !modeAllowed(memoryMode) || !modeAllowed(locationMode)
          || (rawMemoryId !== null && snapshot.get('domains.memory.replayVisible') !== true)) {
          stopForPrivacy('Captured Reality closed because memory or location consent is no longer active.')
        }
      },
      () => stopForPrivacy('Captured Reality closed because privacy authority could not be observed.'),
    ))
    stops.push(onSnapshot(
      doc(db, 'users', user.uid, 'privacyRuntime', 'location-collection'),
      (snapshot) => {
        if (!snapshot.exists() || snapshot.get('enabled') !== true) {
          stopForPrivacy('Captured Reality closed because location collection is paused.')
        }
      },
      () => stopForPrivacy('Captured Reality closed because location runtime authority could not be observed.'),
    ))

    void (async () => {
      try {
        if (!(await assetAuthority)) {
          stopForPrivacy('Captured Reality closed because this asset is unavailable or revoked.')
          return
        }
        if (disposed || revokedRef.current || !identityCurrent()) return
        const asset = await loadAssetMetadata(assetId)
        if (disposed || revokedRef.current || !identityCurrent()) return
        setMetadata(asset)
        truthLabelRef.current = asset.truthLabel

        const prerequisites = localBrowserPrerequisites()
        if (!prerequisites.webgl2 || !prerequisites.webWorker || !prerequisites.readableStream) {
          const capability = capturedRealityBrowserCapability({
            ...prerequisites,
            contentLengthAvailable: true,
          })
          setDecision(fallbackDecision(asset.truthLabel))
          setState({ kind: 'fallback', message: capability.missing.join(', ') || 'Spatial rendering is unavailable.' })
          return
        }

        const nextDelivery = await loadRuntimeDelivery(assetId, accessMode)
        if (disposed || revokedRef.current || !identityCurrent()) return

        const hasLength = await contentLengthAvailable(nextDelivery, requestHeaders, abort.signal)
        if (disposed || revokedRef.current || !identityCurrent()) return

        const capability = capturedRealityBrowserCapability({
          ...prerequisites,
          contentLengthAvailable: hasLength,
        })
        if (!capability.supported) {
          setDecision(fallbackDecision(asset.truthLabel))
          setState({ kind: 'fallback', message: capability.missing.join(', ') })
          return
        }

        setDelivery(nextDelivery)
        setDecision(splatDecision(nextDelivery))
        setState({ kind: 'ready' })
      } catch {
        if (disposed || revokedRef.current || abort.signal.aborted || !identityCurrent()) return
        setDelivery(null)
        setDecision(suppressedDecision())
        setState({ kind: 'error', message: 'This private captured place could not be opened.' })
      }
    })()

    return () => {
      disposed = true
      window.clearTimeout(assetAuthorityTimeout)
      abort.abort()
      if (activeLoadAbort.current === abort) activeLoadAbort.current = null
      for (const stop of stops) stop()
      setDelivery(null)
    }
  }, [accessMode, assetId, memoryEntryActive, rawMemoryId, suppress, user, requestHeaders])

  useEffect(() => {
    if (!user || !assetId || !delivery || state.kind !== 'ready') return
    let cancelled = false
    let timer: number | null = null
    let activeAbort: AbortController | null = null
    const identityCurrent = () => getAuth(app).currentUser === user

    const scheduleRenewal = (expiresAt: string) => {
      const expires = Date.parse(expiresAt)
      if (!Number.isFinite(expires)) {
        suppress('Captured Reality closed because the private delivery expiry was invalid.')
        return
      }
      const refreshIn = Math.min(30_000, Math.max(5_000, expires - Date.now() - 60_000))
      timer = window.setTimeout(() => {
        void (async () => {
          const renewalAbort = new AbortController()
          activeAbort = renewalAbort
          activeLoadAbort.current = renewalAbort
          try {
            const next = await loadRuntimeDelivery(assetId, accessMode)
            if (cancelled || revokedRef.current || !identityCurrent()) return
            if (next.runtimeSha256 !== delivery.runtimeSha256
              || next.runtimeByteLength !== delivery.runtimeByteLength
              || next.storageGeneration !== delivery.storageGeneration) throw new Error('PRIVATE_ARTIFACT_REVISION_CHANGED')
            const prerequisites = localBrowserPrerequisites()
            const hasLength = await contentLengthAvailable(next, requestHeaders, renewalAbort.signal)
            if (cancelled || revokedRef.current || !identityCurrent()) return
            const capability = capturedRealityBrowserCapability({ ...prerequisites, contentLengthAvailable: hasLength })
            if (!capability.supported) throw new Error('browser capability changed')

            // Do not swap the active URL: the already-loaded GPU resource remains
            // valid while current authority is observed. Cache the renewed descriptor
            // only for a future recovery/new fetch so URL rotation cannot remount a
            // 160 MiB splat in the middle of an open memory.
            renewedDeliveryRef.current = next
            scheduleRenewal(next.expiresAt)
          } catch {
            if (!cancelled && identityCurrent()) suppress('Captured Reality closed because private delivery could not be renewed.')
          }
        })()
      }, refreshIn)
    }

    renewedDeliveryRef.current = null
    scheduleRenewal(delivery.expiresAt)
    return () => {
      cancelled = true
      activeAbort?.abort()
      if (activeLoadAbort.current === activeAbort) activeLoadAbort.current = null
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [accessMode, assetId, delivery, state.kind, suppress, user, requestHeaders])

  const stateMessage = useMemo(() => {
    if (state.kind === 'auth-loading') return 'Checking private identity…'
    if (state.kind === 'unauthenticated') return 'Sign in before opening a private captured place.'
    if (state.kind === 'loading') return 'Opening your private captured place…'
    if ('message' in state) return state.message
    return ''
  }, [state])

  if (!assetId || user === undefined || !user || state.kind === 'loading' || state.kind === 'error') {
    return (
      <main data-testid="captured-reality-private-route" data-state={state.kind} style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, background: '#05070b', color: '#f7f7f5' }}>
        <section aria-live="polite" style={{ maxWidth: 560, textAlign: 'center' }}>
          <p>{stateMessage}</p>
          {state.kind === 'unauthenticated' ? <a href="/login">Continue securely</a> : null}
          <button type="button" onClick={exit} style={{ minWidth: 48, minHeight: 48 }}>Return to memory</button>
              <AdamLauncherSlot name="captured-reality-fallback" as="div" />
        </section>
      </main>
    )
  }

  return (
    <main data-testid="captured-reality-private-route" data-state={state.kind} data-asset-id={assetId} data-access-mode={accessMode}>
      {accessMode === 'proof' ? (
        <p role="status" style={{ position: 'fixed', zIndex: 20, left: 16, bottom: 16, margin: 0, padding: '8px 12px', borderRadius: 999, background: 'rgba(5,7,11,.9)', color: '#f7f7f5', fontSize: 12 }}>
          Private proof mode · not launch runtime
        </p>
      ) : null}
      <CapturedRealityPrivateScene
        decision={memoryEntryActive ? decision : suppressedDecision()}
        reducedMotion={reducedMotion}
        onExit={exit}
        onOpenProvenance={() => setShowProvenance((value) => !value)}
        authority={memoryEntryActive ? streamAuthority : undefined}
      />
      {showProvenance && metadata ? (
        <aside
          aria-label="Captured Reality provenance"
          style={{ position: 'fixed', zIndex: 10, right: 16, bottom: 16, maxWidth: 360, padding: 16, borderRadius: 16, background: 'rgba(5,7,11,.92)', color: '#f7f7f5' }}
        >
          <strong>{metadata.label}</strong>
          <p>{metadata.truthLabel}</p>
          <dl>
            <dt>Truth class</dt><dd>{metadata.truthClass}</dd>
            <dt>Reconstruction</dt><dd>{metadata.reconstructionMethod}</dd>
            <dt>Source evidence</dt><dd>{metadata.sourceCount} private source record(s)</dd>
            <dt>Review</dt><dd>{metadata.reviewState}</dd>
          </dl>
          <p>Exact source locators and private location are intentionally not exposed here.</p>
        </aside>
      ) : null}
    </main>
  )
}
