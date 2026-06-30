'use client'

import Link from 'next/link'
import LifeMapScene from '@/components/lifemap/LifeMapScene'
import styles from './SpatialLifeMapCanonical.module.css'

export default function SpatialLifeMapCanonical() {
  return (
    <section className={styles.shell} data-testid="urai-r3f-canonical-lifemap" aria-label="URAI canonical spatial Life Map">
      <div className={styles.scene}>
        <LifeMapScene />
      </div>

      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.depthField} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <header className={styles.titlePanel}>
        <p>URAI Spatial · Life Map</p>
        <h1>Life Map</h1>
        <span>
          Move through memory space. Wheel to zoom, drag to orbit, select a star, then enter Focus or Replay.
        </span>
      </header>

      <aside className={styles.controlPanel} aria-label="Life Map movement controls">
        <p>Spatial controls</p>
        <strong>Wheel / pinch / drag</strong>
        <span>Camera movement is active. This is the R3F Life Map foundation.</span>
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
