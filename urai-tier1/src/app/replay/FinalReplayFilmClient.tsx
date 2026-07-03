'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import styles from './FinalReplayFilmClient.module.css'

const beats = ['Pressure arrives', 'Ground anchor', 'Camera enters star', 'Body return', 'Meaning forms', 'Mirror next'] as const
const focusHref = '/focus?memoryId=quiet-reset&unwind=replay'

export default function FinalReplayFilmClient() {
  const router = useRouter()
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(34)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      setReducedMotion(media.matches)
      if (media.matches) setPlaying(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!playing || reducedMotion) return
    const timer = window.setInterval(() => setProgress((value) => value >= 100 ? 0 : Math.min(100, value + 1.5)), 420)
    return () => window.clearInterval(timer)
  }, [playing, reducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        router.push(focusHref)
      }
      if (event.key === ' ' && !event.repeat) {
        event.preventDefault()
        setPlaying((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  const activeBeat = useMemo(() => Math.min(beats.length - 1, Math.floor((progress / 100) * beats.length)), [progress])
  const routeStyle = {
    '--replay-art': assetCssStack(replayAssets.primary),
    '--replay-progress': `${progress}%`,
  } as CSSProperties

  return (
    <main
      className={styles.surface}
      style={routeStyle}
      data-testid="urai-replay-surface"
      data-urai-final-replay-film="true"
      data-mode="replay"
      data-replay-phase={playing ? 'replay_playing' : 'replay_paused'}
      data-playing={playing ? 'true' : 'false'}
    >
      <div className={styles.atmosphere} aria-hidden="true" />
      <section className={styles.stage}>
        <header className={styles.titlePanel}>
          <p>URAI Replay · Pattern Replay</p>
          <h1>Memory film.</h1>
          <span>Source: Life Map · The Quiet Reset. The camera moves through atmosphere, body signal, meaning, and return.</span>
          <div className={styles.actions}>
            <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause replay' : 'Play replay'}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <Link href={focusHref}>Return to Focus</Link>
            <Link href="/unwind?from=replay">Unwind</Link>
            <Link href="/mirror?from=replay">Open Mirror</Link>
          </div>
          <small>Space pauses or plays · Esc returns to Focus</small>
        </header>

        <aside className={styles.filmPanel} data-testid="urai-replay-meta-panel" aria-label="Replay narrator panel">
          <div className={styles.frame} aria-label="The Quiet Reset cinematic replay">
            <div className={styles.star} aria-hidden="true"><i /><b /></div>
            <div className={styles.frameCaption}><span>URAI Replay</span><strong>{beats[activeBeat]}</strong></div>
          </div>
          <div className={styles.readout}><p>Replay thread active</p><h2>The Quiet Reset</h2><span>Private · Only visible to you</span></div>
          <div className={styles.beatRail} aria-label="Film beats">
            {beats.map((beat, index) => <span key={beat} data-active={index === activeBeat ? 'true' : 'false'}>{index + 1}. {beat}</span>)}
          </div>
          <div className={styles.timeline} data-testid="urai-replay-timeline" aria-label="Replay playback controls">
            <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause this memory replay' : 'Play this memory replay'}>{playing ? 'Pause' : 'Play'}</button>
            <input type="range" min="0" max="100" step="1" value={Math.round(progress)} onChange={(event) => { setProgress(Number(event.currentTarget.value)); setPlaying(false) }} aria-label="Replay timeline" />
            <output>{Math.round(progress)}%</output>
          </div>
        </aside>
      </section>
      <nav className={styles.routeRail} aria-label="URAI memory route chain">
        <Link href="/life-map">Life Map</Link><Link href="/focus?memoryId=quiet-reset">Focus</Link><Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread" aria-current="page">Replay</Link><Link href="/mirror">Mirror</Link><Link href="/passport">Passport</Link>
      </nav>
    </main>
  )
}
