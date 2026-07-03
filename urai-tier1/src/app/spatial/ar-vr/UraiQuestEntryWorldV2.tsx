'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import QuestVrEntryButton from './QuestVrEntryButton'
import styles from './UraiQuestEntryWorld.module.css'
import { UraiXrWorldRuntime, XR_PORTALS, type XrSessionLike } from './xrEntryWorldRuntime'

export default function UraiQuestEntryWorldV2() {
  const router = useRouter()
  const mountRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<UraiXrWorldRuntime | null>(null)
  const [message, setMessage] = useState('Building the explorable entry chamber…')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [vrActive, setVrActive] = useState(false)
  const [rendererReady, setRendererReady] = useState(false)

  const openRoute = useCallback(async (route: string, label: string) => {
    const runtime = runtimeRef.current
    setMessage(`Opening ${label}…`)
    if (runtime?.session) {
      try {
        await runtime.session.end()
      } catch {
        // Route continuity still proceeds if the browser already ended the session.
      }
    }
    router.push(route)
  }, [router])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    try {
      const runtime = new UraiXrWorldRuntime(mount, setMessage, (route, label) => void openRoute(route, label))
      runtimeRef.current = runtime
      setRendererReady(true)
      setMessage('World ready. Drag to look, use WASD to move, select a portal, or enter Quest VR.')
      return () => {
        runtime.dispose()
        runtimeRef.current = null
      }
    } catch {
      setRendererReady(false)
      setMessage('Real-time 3D is unavailable on this device. The accessible portal controls remain active.')
    }
  }, [openRoute])

  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.reducedMotion = reducedMotion
  }, [reducedMotion])

  const attachSession = useCallback(async (session: object) => {
    const runtime = runtimeRef.current
    if (!runtime) throw new Error('XR renderer is not ready')
    runtime.session = session as XrSessionLike
    await runtime.renderer.xr.setSession(session as never)
    setVrActive(true)
    setMessage('Immersive world active. Aim and select a portal, or select the floor to teleport.')
  }, [])

  const exitVr = useCallback(async () => {
    const runtime = runtimeRef.current
    if (!runtime?.session) return
    try {
      await runtime.session.end()
    } finally {
      runtime.session = null
      setVrActive(false)
      setMessage('Immersive session ended safely. Your chamber remains available.')
    }
  }, [])

  const hold = useCallback((code: string, held: boolean) => runtimeRef.current?.setKey(code, held), [])

  return (
    <section className={styles.world} data-testid="urai-quest-explorable-world" data-quest-proof="QUEST_IMMERSIVE_ENTRY_VERIFIED_MINIMAL_SHELL" data-renderer-ready={rendererReady ? 'true' : 'false'} aria-label="URAI explorable XR entry world">
      <div ref={mountRef} className={styles.mount} />
      <header className={styles.hud}>
        <p>URAI XR ENTRY · LIVE 3D</p>
        <strong>Explorable entry chamber</strong>
        <span aria-live="polite">{message}</span>
      </header>
      <div className={styles.controls} aria-label="XR and comfort controls">
        <QuestVrEntryButton onSessionRequested={attachSession} onSessionEnded={() => {
          if (runtimeRef.current) runtimeRef.current.session = null
          setVrActive(false)
          setMessage('Immersive session ended safely. Your chamber remains available.')
        }} />
        {vrActive ? <button type="button" onClick={() => void exitVr()}>Exit VR safely</button> : null}
        <button type="button" onClick={() => runtimeRef.current?.recenter()}>Recenter</button>
        <button type="button" aria-pressed={reducedMotion} onClick={() => setReducedMotion((value) => !value)}>{reducedMotion ? 'Reduced motion on' : 'Reduce motion'}</button>
      </div>
      <nav className={styles.portals} aria-label="Accessible portal equivalents">
        {XR_PORTALS.map((portal) => <button key={portal.id} type="button" onClick={() => void openRoute(portal.route, portal.label)}>{portal.label}</button>)}
      </nav>
      <div className={styles.touch} aria-label="Touch movement controls">
        <button type="button" aria-label="Turn left" onPointerDown={() => hold('KeyQ', true)} onPointerUp={() => hold('KeyQ', false)} onPointerCancel={() => hold('KeyQ', false)}>↶</button>
        <button type="button" aria-label="Move forward" onPointerDown={() => hold('KeyW', true)} onPointerUp={() => hold('KeyW', false)} onPointerCancel={() => hold('KeyW', false)}>↑</button>
        <button type="button" aria-label="Move backward" onPointerDown={() => hold('KeyS', true)} onPointerUp={() => hold('KeyS', false)} onPointerCancel={() => hold('KeyS', false)}>↓</button>
        <button type="button" aria-label="Turn right" onPointerDown={() => hold('KeyE', true)} onPointerUp={() => hold('KeyE', false)} onPointerCancel={() => hold('KeyE', false)}>↷</button>
      </div>
      <p className={styles.help}>Desktop: drag to look · WASD move · Q/E or arrows turn · R recenter. Quest: controller ray selects portals; select the floor to teleport; thumbstick snaps 30°.</p>
    </section>
  )
}
