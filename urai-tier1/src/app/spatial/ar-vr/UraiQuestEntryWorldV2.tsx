'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import QuestVrEntryButton from './QuestVrEntryButton'
import styles from './UraiQuestEntryWorld.module.css'
import {
  UraiXrWorldRuntime,
  XR_PORTALS,
  type XrSessionLike,
} from './xrEntryWorldRuntime'

const HELD_CONTROL_CODES = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
] as const

type RuntimeInputSource = {
  gamepad?: Gamepad
  handedness?: string
}

function runtimeSessionForRightHandTurning(
  session: XrSessionLike,
): XrSessionLike {
  return {
    end: () => session.end(),

    addEventListener: (
      type: string,
      listener: () => void,
      options?: { once?: boolean },
    ) =>
      session.addEventListener(
        type,
        listener,
        options,
      ),

    get inputSources() {
      const sources = Array.from(
        (session.inputSources ??
          []) as ArrayLike<RuntimeInputSource>,
      )
      const rightHandSources = sources.filter(
        (source) =>
          source.handedness === 'right',
      )
      const turnSources =
        rightHandSources.length > 0
          ? rightHandSources
          : sources.filter(
              (source) =>
                source.handedness !== 'left',
            )

      return turnSources as ArrayLike<{
        gamepad?: Gamepad
      }>
    },
  }
}

export default function UraiQuestEntryWorldV2() {
  const router = useRouter()
  const mountRef = useRef<HTMLDivElement>(null)
  const runtimeRef =
    useRef<UraiXrWorldRuntime | null>(null)

  const [message, setMessage] = useState(
    'Opening the living threshold…',
  )
  const [
    reducedMotion,
    setReducedMotion,
  ] = useState(false)
  const [vrActive, setVrActive] =
    useState(false)
  const [
    rendererReady,
    setRendererReady,
  ] = useState(false)

  const openRoute = useCallback(
    async (
      route: string,
      label: string,
    ) => {
      const runtime = runtimeRef.current
      const destination =
        route === '/spatial/life-map'
          ? '/life-map'
          : route

      if (runtime?.session) {
        try {
          await runtime.session.end()
        } catch {
          // Continue if the browser already ended
          // the immersive session.
        } finally {
          runtime.session = null
          setVrActive(false)
        }
      }

      setMessage(`Opening ${label}…`)
      router.push(destination)
    },
    [router],
  )

  useEffect(() => {
    const mount = mountRef.current

    if (!mount) {
      return
    }

    try {
      const runtime =
        new UraiXrWorldRuntime(
          mount,
          setMessage,
          (route, label) => {
            void openRoute(route, label)
          },
        )

      const clearHeldControls = () => {
        HELD_CONTROL_CODES.forEach(
          (code) => {
            runtime.setKey(code, false)
          },
        )
      }

      const clearWhenHidden = () => {
        if (document.hidden) {
          clearHeldControls()
        }
      }

      runtimeRef.current = runtime
      window.addEventListener(
        'blur',
        clearHeldControls,
      )
      document.addEventListener(
        'visibilitychange',
        clearWhenHidden,
      )

      setRendererReady(true)
      setMessage(
        'World ready. Select the sky to ascend or the ground to descend.',
      )

      return () => {
        window.removeEventListener(
          'blur',
          clearHeldControls,
        )
        document.removeEventListener(
          'visibilitychange',
          clearWhenHidden,
        )
        clearHeldControls()

        if (runtime.session) {
          void runtime.session
            .end()
            .catch(() => undefined)
        }

        runtime.session = null
        runtime.dispose()
        runtimeRef.current = null
      }
    } catch {
      runtimeRef.current = null
      setRendererReady(false)
      setVrActive(false)
      setMessage(
        'Real-time 3D is unavailable on this device. The accessible sky and ground controls remain active.',
      )
    }
  }, [openRoute])

  useEffect(() => {
    const runtime = runtimeRef.current

    if (runtime) {
      runtime.reducedMotion =
        reducedMotion
    }
  }, [reducedMotion])

  const attachSession = useCallback(
    async (session: object) => {
      const runtime = runtimeRef.current

      if (!runtime) {
        throw new Error(
          'XR renderer is not ready',
        )
      }

      const nativeSession =
        session as XrSessionLike
      runtime.session =
        runtimeSessionForRightHandTurning(
          nativeSession,
        )

      try {
        await runtime.renderer.xr.setSession(
          session as never,
        )
        setVrActive(true)
        setMessage(
          'Immersive world active. Aim upward and select the sky, or aim down and select the ground.',
        )
      } catch (error) {
        runtime.session = null
        setVrActive(false)
        throw error
      }
    },
    [],
  )

  const handleSessionEnded =
    useCallback(() => {
      const runtime = runtimeRef.current

      if (runtime) {
        runtime.session = null

        HELD_CONTROL_CODES.forEach(
          (code) => {
            runtime.setKey(code, false)
          },
        )
      }

      setVrActive(false)
      setMessage(
        'Immersive session ended safely. The threshold remains available.',
      )
    }, [])

  const exitVr = useCallback(async () => {
    const runtime = runtimeRef.current

    if (!runtime?.session) {
      handleSessionEnded()
      return
    }

    try {
      await runtime.session.end()
    } catch {
      // The XR runtime may already have ended.
    } finally {
      handleSessionEnded()
    }
  }, [handleSessionEnded])

  const hold = useCallback(
    (code: string, held: boolean) => {
      runtimeRef.current?.setKey(
        code,
        held,
      )
    },
    [],
  )

  const releaseTouchControls =
    useCallback(() => {
      hold('KeyQ', false)
      hold('KeyW', false)
      hold('KeyS', false)
      hold('KeyE', false)
    }, [hold])

  return (
    <section
      className={styles.world}
      data-testid="urai-quest-explorable-world"
      data-quest-proof="QUEST_IMMERSIVE_ENTRY_SOURCE_READY_DEVICE_PROOF_PENDING"
      data-renderer-ready={
        rendererReady ? 'true' : 'false'
      }
      aria-label="URAI living XR entry world"
    >
      <div
        ref={mountRef}
        className={styles.mount}
      />

      <header className={styles.hud}>
        <p>URAI XR ENTRY · LIVE 3D</p>
        <strong>Living threshold</strong>
        <span aria-live="polite">
          {message}
        </span>
      </header>

      <div
        className={styles.guide}
        aria-hidden="true"
      >
        <div className={styles.skyGuide}>
          <span>↑</span>
          <strong>Select the sky</strong>
          <small>Ascend to Life Map</small>
        </div>
        <div
          className={styles.groundGuide}
        >
          <strong>Select the ground</strong>
          <small>
            Descend to Ground HQ
          </small>
          <span>↓</span>
        </div>
      </div>

      <div
        className={styles.controls}
        aria-label="XR and comfort controls"
      >
        <QuestVrEntryButton
          onSessionRequested={
            attachSession
          }
          onSessionEnded={
            handleSessionEnded
          }
        />

        {vrActive ? (
          <button
            type="button"
            onClick={() => {
              void exitVr()
            }}
          >
            Exit VR safely
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            runtimeRef.current?.recenter()
          }}
        >
          Recenter
        </button>

        <button
          type="button"
          aria-pressed={reducedMotion}
          onClick={() => {
            setReducedMotion(
              (current) => !current,
            )
          }}
        >
          {reducedMotion
            ? 'Reduced motion on'
            : 'Reduce motion'}
        </button>
      </div>

      <nav
        className={styles.destinations}
        aria-label="Accessible sky and ground destinations"
      >
        {XR_PORTALS.slice(0, 2).map(
          (destination) => (
            <button
              key={destination.id}
              type="button"
              className={
                destination.id ===
                'life-map'
                  ? styles.skyDestination
                  : styles.groundDestination
              }
              onClick={() => {
                void openRoute(
                  destination.route,
                  destination.label,
                )
              }}
            >
              {destination.label}
            </button>
          ),
        )}
      </nav>

      <button
        type="button"
        className={styles.home}
        onClick={() => {
          void openRoute(
            '/home',
            'Home',
          )
        }}
      >
        Return Home
      </button>

      <div
        className={styles.touch}
        aria-label="Touch movement controls"
        onPointerCancel={
          releaseTouchControls
        }
        onPointerLeave={
          releaseTouchControls
        }
      >
        <button
          type="button"
          aria-label="Turn left"
          onPointerDown={() =>
            hold('KeyQ', true)
          }
          onPointerUp={() =>
            hold('KeyQ', false)
          }
          onPointerCancel={() =>
            hold('KeyQ', false)
          }
          onPointerLeave={() =>
            hold('KeyQ', false)
          }
        >
          ↶
        </button>

        <button
          type="button"
          aria-label="Move forward"
          onPointerDown={() =>
            hold('KeyW', true)
          }
          onPointerUp={() =>
            hold('KeyW', false)
          }
          onPointerCancel={() =>
            hold('KeyW', false)
          }
          onPointerLeave={() =>
            hold('KeyW', false)
          }
        >
          ↑
        </button>

        <button
          type="button"
          aria-label="Move backward"
          onPointerDown={() =>
            hold('KeyS', true)
          }
          onPointerUp={() =>
            hold('KeyS', false)
          }
          onPointerCancel={() =>
            hold('KeyS', false)
          }
          onPointerLeave={() =>
            hold('KeyS', false)
          }
        >
          ↓
        </button>

        <button
          type="button"
          aria-label="Turn right"
          onPointerDown={() =>
            hold('KeyE', true)
          }
          onPointerUp={() =>
            hold('KeyE', false)
          }
          onPointerCancel={() =>
            hold('KeyE', false)
          }
          onPointerLeave={() =>
            hold('KeyE', false)
          }
        >
          ↷
        </button>
      </div>

      <p className={styles.help}>
        Desktop: drag to look · WASD move
        · Q/E or arrows turn · R recenter.
        Quest: aim and select sky or ground;
        right thumbstick snaps 30°.
      </p>
    </section>
  )
}
