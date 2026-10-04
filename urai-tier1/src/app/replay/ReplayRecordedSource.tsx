'use client'

import { useEffect, useRef } from 'react'
import type { SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { sensorySafeEnabled, URAI_SENSORY_SAFE_EVENT, URAI_SENSORY_SAFE_STORAGE_KEY } from '@/spatial/accessibility/SensorySafeRuntime'
import { createReplayVideoSession, type ReplayVideoSession, type ReplayVideoSnapshot } from './replayMediaSession'

export type ReplayImageState = { status: 'loading' | 'ready' | 'error'; error: string | null }

type Props = {
  media: SelectedMemoryMedia
  title: string
  demo?: boolean
  onImageState: (state: ReplayImageState) => void
  onVideoSnapshot: (state: ReplayVideoSnapshot) => void
  onVideoSession: (session: ReplayVideoSession | null) => void
}

/** sourceMedia has no panorama/reconstruction attestation: preserve the recorded framing. */
export function ReplayRecordedSource({ media, title, demo = false, onImageState, onVideoSnapshot, onVideoSession }: Props) {
  const imageRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    if (media.kind !== 'video' || !videoRef.current) {
      const image = imageRef.current
      onImageState({ status: 'loading', error: null })
      if (image) image.src = media.url
      return () => { active.current = false; image?.removeAttribute('src') }
    }
    const session = createReplayVideoSession(videoRef.current, media.url, onVideoSnapshot, { audioAllowed: () => !sensorySafeEnabled() })
    const refreshPolicy = () => session.refreshAudioPolicy()
    const onStorage = (event: StorageEvent) => {
      if (event.key === URAI_SENSORY_SAFE_STORAGE_KEY || event.key === null) refreshPolicy()
    }
    window.addEventListener(URAI_SENSORY_SAFE_EVENT, refreshPolicy)
    window.addEventListener('storage', onStorage)
    onVideoSession(session)
    return () => {
      active.current = false
      window.removeEventListener(URAI_SENSORY_SAFE_EVENT, refreshPolicy)
      window.removeEventListener('storage', onStorage)
      onVideoSession(null)
      session.dispose()
    }
  }, [media.kind, media.url, onImageState, onVideoSession, onVideoSnapshot])

  const imageLoaded = async () => {
    const image = imageRef.current
    if (!image) return
    try {
      await image.decode()
      if (active.current && imageRef.current === image) onImageState({ status: 'ready', error: null })
    } catch {
      if (active.current && imageRef.current === image) onImageState({ status: 'error', error: demo ? 'The demonstration environment could not be decoded.' : 'The recorded image could not be decoded. Retry or choose another memory.' })
    }
  }

  return (
    <section className="replayRecordedSource" aria-label={`${demo ? 'Demonstration' : 'Recorded'} source for ${title}`} data-replay-visual-owner={demo ? 'disclosed-demo-asset-fallback' : 'recorded-source-original-framing'} data-replay-source-kind={media.kind}>
      {media.kind === 'image'
        ? <img ref={imageRef} src={media.url} alt={media.caption ?? `Recorded image for ${title}`} decoding="async" onLoad={() => void imageLoaded()} onError={() => { if (active.current) onImageState({ status: 'error', error: demo ? 'The demonstration environment could not be opened.' : 'The recorded image could not be opened. Retry or choose another memory.' }) }} />
        : <video ref={videoRef} playsInline muted preload="auto" aria-label={media.caption ?? `Recorded video for ${title}`} />}
    </section>
  )
}
