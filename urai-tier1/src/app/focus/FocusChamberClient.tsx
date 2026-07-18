'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { assetCssStack, focusAssets } from '@/spatial/assets/uraiAssets'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import type { SelectedMemoryResult } from '@/spatial/memory/selectedMemoryContract'
import styles from './FocusChamber.module.css'
import landscapeStyles from './FocusChamberLandscape.module.css'
import cinematicStyles from './FocusChamberCinematic.module.css'

const DEMO_FOCUS_HREF = '/focus?memoryId=demo%3Aquiet-reset&node=quiet-reset&manifestId=replay-recovery-thread&demo=1&from=focus-recovery'

type MediaState = 'absent' | 'loading' | 'ready' | 'failed'

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

function recoveryCopy(result: SelectedMemoryResult) {
  const message = result.message.toLowerCase()
  if (result.status === 'loading') {
    return {
      eyebrow: 'Crossing the threshold',
      title: 'Opening the memory chamber',
      body: 'The selected memory is being resolved privately. Its identity and return path remain held while the chamber forms.',
      canRetry: false,
    }
  }
  if (result.status === 'unauthorized') {
    return {
      eyebrow: 'Private boundary held',
      title: 'This chamber is still locked',
      body: result.message,
      canRetry: true,
    }
  }
  if (result.status === 'deleted') {
    return {
      eyebrow: 'Memory released',
      title: 'This chamber is no longer here',
      body: result.message,
      canRetry: false,
    }
  }
  if (result.status === 'corrupt') {
    return {
      eyebrow: 'Path protected',
      title: 'The memory and Replay path no longer match',
      body: result.message,
      canRetry: false,
    }
  }
  if (message.includes('no memory was selected')) {
    return {
      eyebrow: 'No star selected',
      title: 'Choose a memory before entering Focus',
      body: result.message,
      canRetry: false,
    }
  }
  if (message.includes('offline')) {
    return {
      eyebrow: 'Connection paused',
      title: 'The chamber is waiting safely',
      body: result.message,
      canRetry: true,
    }
  }
  if (message.includes('temporarily unavailable')) {
    return {
      eyebrow: 'Private service protected',
      title: 'The chamber cannot open yet',
      body: result.message,
      canRetry: true,
    }
  }
  return {
    eyebrow: 'Memory path protected',
    title: 'This chamber could not open safely',
    body: result.message,
    canRetry: true,
  }
}

function FocusRecovery({ result }: { result: SelectedMemoryResult }) {
  const copy = recoveryCopy(result)
  const returnToLifeMap = useCallback(() => {
    requestUraiWorldTravel({
      destination: 'life-map',
      href: '/life-map',
      entryPortal: 'focus-recovery-return',
      cameraCheckpoint: 'life-map-overview',
    })
  }, [])
  const openDemo = useCallback(() => {
    requestUraiWorldTravel({
      destination: 'focus',
      href: DEMO_FOCUS_HREF,
      entryPortal: 'focus-recovery-demo',
      cameraCheckpoint: 'focus:quiet-reset',
    })
  }, [])

  return (
    <main
      className={`${styles.recovery} ${cinematicStyles.recoveryCinematic}`}
      data-testid="urai-final-focus-chamber"
      data-memory-status={result.status}
      data-orb-owner="none"
      data-canonical-asset={focusAssets.primary.src}
    >
      <div className={styles.recoveryAtmosphere} aria-hidden="true" />
      <div className={styles.recoveryThreshold} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section
        className={styles.recoveryContent}
        role={result.status === 'loading' ? 'status' : 'alert'}
        aria-live={result.status === 'loading' ? 'polite' : 'assertive'}
      >
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.recoveryBody}>{copy.body}</p>
        <div className={styles.recoveryActions}>
          <button type="button" className={styles.primaryAction} onClick={returnToLifeMap}>Return to Life Map</button>
          {copy.canRetry ? <button type="button" className={styles.secondaryAction} onClick={() => window.location.reload()}>Try again</button> : null}
          {result.status !== 'loading' ? <button type="button" className={styles.textAction} onClick={openDemo}>Open disclosed demo</button> : null}
        </div>
        <p className={styles.privacyNote}>No substitute personal memory was created, exposed, or inferred.</p>
      </section>
    </main>
  )
}

export default function FocusChamberClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const mainRef = useRef<HTMLElement>(null)
  const media = memory?.sourceMedia?.find((item) => item.kind === 'image')
  const [mediaState, setMediaState] = useState<MediaState>(media ? 'loading' : 'absent')

  useEffect(() => {
    setMediaState(media ? 'loading' : 'absent')
  }, [media?.url])

  useEffect(() => {
    if (!memory) return
    const frame = window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [memory?.id])

  const replayHref = useMemo(() => {
    if (!memory) return null
    const next = new URLSearchParams({
      memoryId: memory.id,
      manifestId: memory.replayManifest.id,
      node: memory.star.id,
      from: 'focus-memory-aperture',
    })
    if (memory.demo) next.set('demo', '1')
    return `/replay?${next.toString()}`
  }, [memory])

  const lifeMapHref = useMemo(() => {
    if (!memory) return '/life-map'
    const next = new URLSearchParams({ node: memory.star.id, from: 'focus-return' })
    if (memory.demo) next.set('demo', '1')
    return `/life-map?${next.toString()}`
  }, [memory])

  const enterReplay = useCallback(() => {
    if (!memory || !replayHref) return
    requestUraiWorldTravel({
      destination: 'replay',
      href: replayHref,
      entryPortal: 'focus-memory-aperture',
      cameraCheckpoint: `focus:${memory.star.id}`,
      context: {
        memoryId: memory.id,
        replayManifestId: memory.replayManifest.id,
        privacyMode: memory.privacy === 'private' ? 'held-private' : 'private',
      },
    })
  }, [memory, replayHref])

  const returnToLifeMap = useCallback(() => {
    if (!memory) return
    requestUraiWorldTravel({
      destination: 'life-map',
      href: lifeMapHref,
      entryPortal: 'focus-return-threshold',
      cameraCheckpoint: `life-map:${memory.star.id}`,
      context: {
        memoryId: memory.star.id,
        privacyMode: memory.privacy === 'private' ? 'held-private' : 'private',
      },
    })
  }, [lifeMapHref, memory])

  if (!memory) return <FocusRecovery result={result} />

  const people = memory.privacy === 'hidden'
    ? 'Held private'
    : memory.people?.filter(Boolean).map((person) => person.relationship ? `${person.label} · ${person.relationship}` : person.label).join(', ') || 'Not recorded'
  const place = memory.privacy === 'hidden' ? 'Held private' : memory.place?.label ?? 'Not recorded'
  const replayAvailable = memory.replayManifest.segments.length > 0 && memory.replayManifest.durationMs > 0
  const style = {
    '--focus-accent': memory.visuals.accent,
    '--focus-light': memory.visuals.light,
    '--focus-sky': memory.visuals.sky,
    '--focus-ground': memory.visuals.ground,
    '--focus-fallback': assetCssStack(focusAssets.primary),
    '--focus-fog': String(memory.visuals.fog ?? 0),
    '--focus-reflection': String(memory.visuals.reflection ?? 0),
  } as CSSProperties

  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      className={`${styles.world} ${cinematicStyles.cinematic}`}
      style={style}
      data-testid="urai-final-focus-chamber"
      data-memory-status={result.status}
      data-memory-id={memory.id}
      data-star-id={memory.star.id}
      data-node={memory.star.id}
      data-manifest-id={memory.replayManifest.id}
      data-media-state={mediaState}
      data-orb-owner="none"
      data-canonical-asset={focusAssets.primary.src}
      aria-labelledby="focus-memory-title"
      aria-describedby="focus-memory-summary"
    >
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.horizon} aria-hidden="true" />
      <div className={styles.depthField} aria-hidden="true"><span /><span /><span /><span /></div>
      <div className={styles.arrivalVeil} aria-hidden="true" />

      <header className={styles.identity}>
        <p className={styles.eyebrow}>{memory.demo ? 'Disclosed demonstration · not personal data' : `${memory.privacy} memory`}</p>
        <h1 id="focus-memory-title">{memory.title}</h1>
        <p className={styles.when}>{dateLabel(memory.occurredAt)}</p>
        <p id="focus-memory-summary" className={styles.summary}>{memory.summary}</p>
      </header>

      <section className={`${styles.chamber} ${landscapeStyles.chamber}`} aria-label={`Memory chamber for ${memory.title}`}>
        <div className={`${styles.shell} ${landscapeStyles.shell}`} data-material={memory.star.material} aria-hidden="true">
          <span className={styles.shellOuter} />
          <span className={styles.shellMiddle} />
          <span className={styles.shellInner} />
        </div>

        <figure className={`${styles.memoryPortal} ${landscapeStyles.memoryPortal}`} data-media-state={mediaState}>
          <div className={styles.portalLight} aria-hidden="true" />
          {media && mediaState !== 'failed' ? (
            <img
              src={media.url}
              alt={media.caption ?? `Memory media for ${memory.title}`}
              onLoad={() => setMediaState('ready')}
              onError={() => setMediaState('failed')}
            />
          ) : (
            <div className={styles.mediaFallback} role="img" aria-label={`Atmospheric representation for ${memory.title}`}>
              <span />
              <strong>{memory.title}</strong>
            </div>
          )}
          <figcaption>{media?.caption ?? memory.narrator.focus}</figcaption>
        </figure>

        <button
          className={`${styles.replayPortal} ${landscapeStyles.replayPortal}`}
          type="button"
          onClick={enterReplay}
          disabled={!replayAvailable}
          aria-label={`Open Replay for ${memory.title}`}
          aria-describedby="focus-replay-description"
        >
          <span className={styles.replayPulse} aria-hidden="true" />
          <small>{replayAvailable ? 'Continue inward' : 'Replay not available'}</small>
          <strong>{replayAvailable ? 'Enter Replay' : 'Stay with this memory'}</strong>
          <span id="focus-replay-description">{replayAvailable ? memory.narrator.replay : 'This memory can be held in Focus without entering a cinematic Replay.'}</span>
        </button>
      </section>

      <details className={styles.meaning}>
        <summary>
          <span>Memory details</span>
          <strong>{memory.privacy === 'hidden' ? 'Held private' : memory.emotionalState || memory.privacy}</strong>
        </summary>
        <div className={styles.meaningPanel}>
          <p>{memory.narrator.focus}</p>
          <dl>
            <div><dt>Emotion</dt><dd>{memory.emotionalState || 'Not recorded'}</dd></div>
            <div><dt>Place</dt><dd>{place}</dd></div>
            <div><dt>People</dt><dd>{people}</dd></div>
            <div><dt>Privacy</dt><dd>{memory.privacy}</dd></div>
          </dl>
        </div>
      </details>

      <nav className={styles.navigation} aria-label="Focus navigation">
        <button type="button" onClick={returnToLifeMap}>← Return to Life Map</button>
        <span>Escape returns safely</span>
      </nav>

      <div className={styles.srStatus} aria-live="polite">
        {mediaState === 'loading' ? 'Memory media loading.' : mediaState === 'failed' ? 'Memory media unavailable. Atmospheric fallback shown.' : ''}
      </div>
    </main>
  )
}
