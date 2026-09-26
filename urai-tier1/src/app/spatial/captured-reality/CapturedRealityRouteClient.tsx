'use client'

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
  capturedRealityWebGL2Available,
  CAPTURED_REALITY_QUALITY_PROFILES,
} from '@/spatial/captured-reality/capturedRealityRuntime'
import { capturedRealityContentLengthAvailable } from '@/spatial/captured-reality/capturedRealityDelivery'
import type { CapturedRealityRenderDecision } from '@/spatial/captured-reality/capturedReality'

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

type RuntimeDelivery = {
  assetId: string
  accessMode: 'runtime' | 'proof'
  url: string
  expiresAt: string
  truthLabel: string
}

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

function localBrowserPrerequisites() {
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

async function loadAssetMetadata(assetId: string) {
  const callable = httpsCallable<{ assetId: string }, AssetMetadata>(functions, 'getCapturedRealityAsset')
  const result = await callable({ assetId })
  return result.data
}

async function loadRuntimeDelivery(assetId: string, accessMode: 'runtime' | 'proof') {
  const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
  const callable = httpsCallable<{ assetId: string; deviceTier: 'desktop' | 'mobile'; accessMode: 'runtime' | 'proof' }, RuntimeDelivery>(functions, 'getCapturedRealityRuntimeUrl')
  const result = await callable({ assetId, deviceTier, accessMode })
  return result.data
}

const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/

export default function CapturedRealityRouteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawAssetId = searchParams.get('assetId') ?? ''
  const assetId = SAFE_ASSET_ID.test(rawAssetId) ? rawAssetId : null
  const accessMode: 'runtime' | 'proof' = searchParams.get('proof') === '1' ? 'proof' : 'runtime'
  const reducedMotion = useReducedMotion()
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [metadata, setMetadata] = useState<AssetMetadata | null>(null)
  const [delivery, setDelivery] = useState<RuntimeDelivery | null>(null)
  const [decision, setDecision] = useState<CapturedRealityRenderDecision>(() => suppressedDecision())
  const [state, setState] = useState<RouteState>({ kind: 'auth-loading' })
  const [showProvenance, setShowProvenance] = useState(false)
  const revokedRef = useRef(false)
  const truthLabelRef = useRef<string | undefined>(undefined)

  const exit = useCallback(() => {
    setDelivery(null)
    setDecision(suppressedDecision(truthLabelRef.current))
    if (window.history.length > 1) router.back()
    else router.push('/replay')
  }, [router])

  const suppress = useCallback((message: string) => {
    revokedRef.current = true
    setDelivery(null)
    setMetadata(null)
    truthLabelRef.current = undefined
    setShowProvenance(false)
    setDecision(suppressedDecision())
    setState({ kind: 'suppressed', message })
  }, [])

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

    revokedRef.current = false
    setState({ kind: 'loading' })
    setDelivery(null)

    let disposed = false
    const identityCurrent = () => getAuth(app).currentUser?.uid === user.uid
    const abort = new AbortController()
    const stops: Unsubscribe[] = []

    const stopForPrivacy = (message: string) => {
      if (disposed) return
      abort.abort()
      suppress(message)
    }

    const db = getFirebaseDb()
    stops.push(onSnapshot(
      doc(db, 'users', user.uid, 'privacyPolicy', 'current'),
      (snapshot) => {
        const memoryMode = policyMode(snapshot, 'memory')
        const locationMode = policyMode(snapshot, 'location')
        if (!modeAllowed(memoryMode) || !modeAllowed(locationMode)) {
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

        const hasLength = await contentLengthAvailable(nextDelivery.url, abort.signal)
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
      abort.abort()
      for (const stop of stops) stop()
      setDelivery(null)
    }
  }, [accessMode, assetId, suppress, user])

  useEffect(() => {
    if (!user || !assetId || !delivery || state.kind !== 'ready') return
    const expires = Date.parse(delivery.expiresAt)
    if (!Number.isFinite(expires)) {
      suppress('Captured Reality closed because the private delivery expiry was invalid.')
      return
    }
    const refreshIn = Math.max(5_000, expires - Date.now() - 60_000)
    let cancelled = false
    const abort = new AbortController()
    const identityCurrent = () => getAuth(app).currentUser?.uid === user.uid
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await loadRuntimeDelivery(assetId, accessMode)
          if (cancelled || revokedRef.current || !identityCurrent()) return
          const prerequisites = localBrowserPrerequisites()
          const hasLength = await contentLengthAvailable(next.url, abort.signal)
          if (cancelled || revokedRef.current || !identityCurrent()) return
          const capability = capturedRealityBrowserCapability({ ...prerequisites, contentLengthAvailable: hasLength })
          if (!capability.supported) throw new Error('browser capability changed')
          setDelivery(next)
          setDecision(splatDecision(next))
        } catch {
          if (!cancelled && identityCurrent()) suppress('Captured Reality closed because private delivery could not be renewed.')
        }
      })()
    }, refreshIn)
    return () => {
      cancelled = true
      abort.abort()
      window.clearTimeout(timer)
    }
  }, [accessMode, assetId, delivery, state.kind, suppress, user])

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
          <button type="button" onClick={exit}>Return to Replay</button>
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
        decision={decision}
        reducedMotion={reducedMotion}
        onExit={exit}
        onOpenProvenance={() => setShowProvenance((value) => !value)}
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
