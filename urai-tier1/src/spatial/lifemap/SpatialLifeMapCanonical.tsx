'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './SpatialLifeMapCanonical.module.css'

const LifeMapScene = dynamic(() => import('@/components/lifemap/LifeMapScene'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100svh',
      display: 'grid',
      placeItems: 'center',
      color: '#dffbff',
      background: 'radial-gradient(circle at 50% 45%, rgba(117,231,255,.18), transparent 28%), #020713',
      fontWeight: 900,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
    }}>
      Opening Life Map…
    </div>
  ),
})

const LIFE_MAP_STATE_KEY = 'urai:spatial:lifeMapState'

export default function SpatialLifeMapCanonical() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.removeItem(LIFE_MAP_STATE_KEY)
    } catch {
      // keep loading even if storage is blocked
    }
    setReady(true)
  }, [])

  return (
    <section className={styles.shell} data-testid="urai-r3f-canonical-lifemap" aria-label="URAI canonical spatial Life Map">
      <div className={styles.scene}>
        {ready ? <LifeMapScene /> : null}
      </div>

      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.depthField} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <header className={styles.titlePanel}>
        <p>URAI Spatial · Life Map</p>
        <h1>Life Map</h1>
        <span>Wheel to zoom. Drag to orbit. Select a memory star, then enter Focus or Replay.</span>
      </header>

      <aside className={styles.controlPanel} aria-label="Life Map movement controls">
        <p>Spatial controls</p>
        <strong>Wheel / pinch / drag</strong>
        <span>The canonical R3F camera layer is active. The map opens from overview every time.</span>
      </aside>

      <aside className={styles.orbPanel} aria-label="URAI orb companion">
        <div className={styles.orb} aria-hidden="true" />
        <div>
          <p>Orb companion</p>
          <span>The galaxy is open. Choose a memory star and stay with it.</span>
        </div>
      </aside>

      <nav className={styles.rail} aria-label="URAI Life Map route portals">
        <Link href="/home">Home</Link>
        <Link href="/ground">Ground</Link>
        <Link href="/focus">Focus</Link>
        <Link href="/replay">Replay</Link>
        <Link href="/mirror">Mirror</Link>
        <Link href="/passport">Passport</Link>
        <Link href="/spatial/ar-vr">XR</Link>
      </nav>
    </section>
  )
}
