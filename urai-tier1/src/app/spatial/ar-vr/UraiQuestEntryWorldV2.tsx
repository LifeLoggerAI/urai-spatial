'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import QuestVrEntryButton from './QuestVrEntryButton'
import styles from './UraiQuestEntryWorld.module.css'
import {
  isSpatialRealmRoute,
  routeToRealm,
  SPATIAL_REALM_LABELS,
  UraiXrWorldRuntime,
  XR_PORTALS,
  type SpatialRealmId,
  type XrSessionLike,
} from './xrEntryWorldRuntime'

const HELD_CONTROL_CODES = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
] as const

const TOUCH_CONTROLS = [
  ['KeyQ', 'Turn left', '↶'],
  ['KeyW', 'Move forward', '↑'],
  ['KeyS', 'Move backward', '↓'],
  ['KeyE', 'Turn right', '↷'],
] as const

type RuntimeInputSource = {
  gamepad?: Gamepad
  handedness?: string
}

type Props = {
  initialRealm?: SpatialRealmId
}

function runtimeSessionForRightHandTurning(session: XrSessionLike): XrSessionLike {
  return {
    end: () => session.end(),
    addEventListener: (type, listener, options) =>
      session.addEventListener(type, listener, options),
    get inputSources() {
      const sources = Array.from(
        (session.inputSources ?? []) as ArrayLike<RuntimeInputSource>,
      )
      const rightHandSources = sources.filter(
        (source) => source.handedness === 'right',
      )
      const turnSources = rightHandSources.length
        ? rightHandSources
        : sources.filter((source) => source.handedness !== 'left')
      return turnSources as ArrayLike<{ gamepad?: Gamepad }>
    },
  }
}

export default function UraiQuestEntryWorldV2({
  initialRealm = 'home',
}: Props) {
  const router = useRouter()
  const mountRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<UraiXrWorldRuntime | null>(null)
  const [realm, setRealm] = useState<SpatialRealmId>(initialRealm)
  const [message, setMessage] = useState(
    `${SPATIAL_REALM_LABELS[initialRealm]} is waking…`,
  )
  const [reducedMotion, setReducedMotion] = useState(false)
  const [vrActive, setVrActive] = useState(false)
  const [rendererReady, setRendererReady] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const openRoute = useCallback(async (route: string, label: string) => {
    const runtime = runtimeRef.current
    const destination = route === '/spatial/life-map' ? '/life-map' : route

    if (isSpatialRealmRoute(destination)) {
      const nextRealm = routeToRealm(destination)
      runtime?.setRealm(nextRealm)
      setRealm(nextRealm)
      setMessage(`${label} entered without leaving the world.`)
      window.history.pushState({ uraiRealm: nextRealm }, '', destination)
      return
    }

    if (runtime?.session) {
      try {
        await runtime.session.end()
      } catch {
        // Continue if the browser already ended the immersive session.
      } finally {
        runtime.session = null
        setVrActive(false)
      }
    }
    router.push(destination)
  }, [router])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    try {
      const runtime = new UraiXrWorldRuntime(
        mount,
        setMessage,
        (route, label) => void openRoute(route, label),
        initialRealm,
      )

      const clearHeldControls = () => {
        HELD_CONTROL_CODES.forEach((code) => runtime.setKey(code, false))
      }
      const clearWhenHidden = () => {
        if (document.hidden) clearHeldControls()
      }
      const followBrowserHistory = () => {
        const nextRealm = routeToRealm(window.location.pathname)
        runtime.setRealm(nextRealm)
        setRealm(nextRealm)
        setMessage(`${SPATIAL_REALM_LABELS[nextRealm]} restored.`)
      }

      runtimeRef.current = runtime
      window.addEventListener('blur', clearHeldControls)
      window.addEventListener('popstate', followBrowserHistory)
      document.addEventListener('visibilitychange', clearWhenHidden)
      setRendererReady(true)
      setMessage(`${SPATIAL_REALM_LABELS[initialRealm]} ready.`)

      return () => {
        window.removeEventListener('blur', clearHeldControls)
        window.removeEventListener('popstate', followBrowserHistory)
        document.removeEventListener('visibilitychange', clearWhenHidden)
        clearHeldControls()
        if (runtime.session) void runtime.session.end().catch(() => undefined)
        runtime.session = null
        runtime.dispose()
        runtimeRef.current = null
      }
    } catch {
      runtimeRef.current = null
      setRendererReady(false)
      setVrActive(false)
      setMessage('Real-time 3D is unavailable. Accessible world controls remain active.')
    }
  }, [initialRealm, openRoute])

  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.reducedMotion = reducedMotion
  }, [reducedMotion])

  const attachSession = useCallback(async (session: object) => {
    const runtime = runtimeRef.current
    if (!runtime) throw new Error('XR renderer is not ready')
    runtime.session = runtimeSessionForRightHandTurning(session as XrSessionLike)
    try {
      await runtime.renderer.xr.setSession(session as never)
      setVrActive(true)
      setMessage('Immersive world active. Select portals or the floor to teleport.')
    } catch (error) {
      runtime.session = null
      setVrActive(false)
      throw error
    }
  }, [])

  const handleSessionEnded = useCallback(() => {
    const runtime = runtimeRef.current
    if (runtime) {
      runtime.session = null
      HELD_CONTROL_CODES.forEach((code) => runtime.setKey(code, false))
    }
    setVrActive(false)
    setMessage('Immersive session ended safely. Your world remains available.')
  }, [])

  const exitVr = useCallback(async () => {
    const runtime = runtimeRef.current
    if (!runtime?.session) return handleSessionEnded()
    try {
      await runtime.session.end()
    } catch {
      // The XR runtime may already have ended the session.
    } finally {
      handleSessionEnded()
    }
  }, [handleSessionEnded])

  const hold = useCallback((code: string, held: boolean) => {
    runtimeRef.current?.setKey(code, held)
  }, [])

  return (
    <section
      className={styles.world}
      data-testid="urai-quest-explorable-world"
      data-quest-proof="QUEST_IMMERSIVE_ENTRY_VERIFIED_MINIMAL_SHELL"
      data-spatial-world-owner="canonical-home-ground-lifemap-focus-replay"
      data-spatial-realm={realm}
      data-renderer-ready={rendererReady ? 'true' : 'false'}
      aria-label={`URAI ${SPATIAL_REALM_LABELS[realm]} spatial world`}
    >
      <div ref={mountRef} className={styles.mount} />

      <header className={styles.hud}>
        <p>URAI WORLD · LIVE 3D</p>
        <strong>{SPATIAL_REALM_LABELS[realm]}</strong>
        <span aria-live="polite">{message}</span>
      </header>

      <div className={styles.controls} aria-label="XR and comfort controls">
        <QuestVrEntryButton
          onSessionRequested={attachSession}
          onSessionEnded={handleSessionEnded}
        />
        {vrActive ? (
          <button type="button" onClick={() => void exitVr()}>
            Exit VR safely
          </button>
        ) : null}
        <button type="button" onClick={() => runtimeRef.current?.recenter()}>
          Recenter
        </button>
        <button
          type="button"
          aria-pressed={reducedMotion}
          onClick={() => setReducedMotion((current) => !current)}
        >
          {reducedMotion ? 'Reduced motion on' : 'Reduce motion'}
        </button>
        <button
          type="button"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((current) => !current)}
        >
          {helpOpen ? 'Hide help' : 'Help'}
        </button>
      </div>

      <nav className={styles.portals} aria-label="Accessible world destinations">
        {XR_PORTALS.map((portal) => (
          <button
            key={portal.id}
            type="button"
            aria-current={portal.realm === realm ? 'page' : undefined}
            className={portal.realm === realm ? styles.activePortal : undefined}
            onClick={() => void openRoute(portal.route, portal.label)}
          >
            {portal.label}
          </button>
        ))}
      </nav>

      <div className={styles.touch} aria-label="Touch movement controls">
        {TOUCH_CONTROLS.map(([code, label, symbol]) => (
          <button
            key={code}
            type="button"
            aria-label={label}
            onPointerDown={() => hold(code, true)}
            onPointerUp={() => hold(code, false)}
            onPointerCancel={() => hold(code, false)}
            onPointerLeave={() => hold(code, false)}
          >
            {symbol}
          </button>
        ))}
      </div>

      {helpOpen ? (
        <p className={styles.help}>
          Desktop: drag to look · WASD move · Q/E or arrows turn · R recenter.
          Quest: controller ray selects portals; select the floor to teleport;
          right thumbstick snaps 30°.
        </p>
      ) : null}
    </section>
  )
}
