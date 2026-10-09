export type ReplayVideoStatus = 'loading' | 'ready' | 'buffering' | 'blocked' | 'error' | 'ended'

export type ReplayVideoSnapshot = {
  status: ReplayVideoStatus
  ready: boolean
  playing: boolean
  muted: boolean
  audioAllowed: boolean
  currentTimeMs: number
  durationMs: number | null
  error: string | null
}

export type ReplayVideoSession = {
  play: () => Promise<void>
  pause: () => void
  seek: (timeMs: number) => void
  setMuted: (muted: boolean) => void
  refreshAudioPolicy: () => void
  dispose: () => void
}

export function initialReplayVideoSnapshot(): ReplayVideoSnapshot {
  return { status: 'loading', ready: false, playing: false, muted: true, audioAllowed: true, currentTimeMs: 0, durationMs: null, error: null }
}

function finiteDurationMs(video: HTMLMediaElement) {
  return Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration * 1000) : null
}

function mediaFailure(video: HTMLMediaElement) {
  switch (video.error?.code) {
    case 2: return 'The recorded video could not be downloaded. Retry when the connection is available.'
    case 3: return 'The recorded video could not be decoded. Retry or choose another memory.'
    case 4: return 'This browser cannot open the recorded video format. Choose another memory or try a compatible browser.'
    default: return 'The recorded video could not be opened. Retry or choose another memory.'
  }
}

/** The decoded source video, rather than a separate animation timer, owns video time. */
export function createReplayMediaSession(
  video: HTMLMediaElement,
  url: string,
  onSnapshot: (snapshot: ReplayVideoSnapshot) => void,
  options: { audioAllowed?: () => boolean; nativeControls?: boolean } = {},
): ReplayVideoSession {
  let disposed = false
  let requestVersion = 0
  let wantsPlayback = false
  let snapshot = initialReplayVideoSnapshot()
  const listeners = new Map<string, EventListener>()

  const publish = (change: Partial<ReplayVideoSnapshot> = {}) => {
    if (disposed) return
    const audioAllowed = options.audioAllowed?.() ?? true
    if (!audioAllowed && !video.muted) video.muted = true
    const durationMs = finiteDurationMs(video)
    const currentTimeMs = Number.isFinite(video.currentTime) ? Math.max(0, Math.round(video.currentTime * 1000)) : 0
    snapshot = {
      ...snapshot,
      durationMs,
      currentTimeMs: durationMs ? Math.min(durationMs, currentTimeMs) : currentTimeMs,
      muted: video.muted,
      audioAllowed,
      ...change,
    }
    onSnapshot(snapshot)
  }
  const decoded = () => video.readyState >= 2 && !video.seeking
  const listen = (event: string, handler: () => void) => {
    const listener: EventListener = () => { if (!disposed) handler() }
    listeners.set(event, listener)
    video.addEventListener(event, listener)
  }
  const fail = (error: string) => {
    wantsPlayback = false
    requestVersion += 1
    video.pause()
    publish({ status: 'error', ready: false, playing: false, error })
  }
  const updateReadiness = () => {
    if (!finiteDurationMs(video)) {
      fail('The recorded video has no usable duration. Retry or choose another memory.')
      return
    }
    if (snapshot.status === 'error' || snapshot.status === 'blocked') return
    publish({ ready: decoded(), status: decoded() ? 'ready' : 'loading', error: null })
  }

  listen('loadedmetadata', updateReadiness)
  listen('durationchange', () => publish())
  listen('loadeddata', updateReadiness)
  listen('canplay', updateReadiness)
  listen('playing', () => {
    if (!wantsPlayback) { video.pause(); return }
    publish({ status: 'ready', ready: decoded(), playing: true, error: null })
  })
  listen('play', () => { if (options.nativeControls) wantsPlayback = true })
  listen('pause', () => publish({ playing: false }))
  listen('waiting', () => publish({ status: 'buffering', ready: false }))
  listen('seeking', () => publish({ status: 'buffering', ready: false }))
  listen('seeked', () => publish({ status: video.ended ? 'ended' : 'ready', ready: decoded() }))
  listen('timeupdate', () => publish())
  listen('volumechange', () => publish())
  listen('ended', () => {
    wantsPlayback = false
    publish({ status: 'ended', ready: decoded(), playing: false })
  })
  listen('error', () => fail(mediaFailure(video)))

  if ('playsInline' in video) (video as HTMLVideoElement).playsInline = true
  video.muted = true
  video.loop = false
  video.preload = 'auto'
  video.src = url
  video.load()
  publish()

  return {
    async play() {
      if (disposed || snapshot.status === 'error') return
      const version = ++requestVersion
      wantsPlayback = true
      publish({ status: decoded() ? 'ready' : 'buffering', ready: decoded(), error: null })
      try {
        if (video.ended || (snapshot.durationMs && snapshot.currentTimeMs >= snapshot.durationMs)) video.currentTime = 0
        // Call play in the originating user gesture; do not route it through a render effect.
        await video.play()
        if (disposed || version !== requestVersion) return
        publish({ status: 'ready', ready: decoded(), playing: !video.paused, error: null })
      } catch (error) {
        if (disposed || version !== requestVersion) return
        wantsPlayback = false
        video.pause()
        const blocked = error instanceof Error && error.name === 'NotAllowedError'
        publish({
          status: blocked ? 'blocked' : 'error',
          ready: blocked && decoded(),
          playing: false,
          error: blocked ? 'Playback was blocked. Press Continue memory to try again.' : 'Playback could not start. Retry the recorded video.',
        })
      }
    },
    pause() {
      if (disposed) return
      wantsPlayback = false
      requestVersion += 1
      video.pause()
      publish({ playing: false })
    },
    seek(timeMs) {
      if (disposed || !Number.isFinite(timeMs) || !snapshot.durationMs || snapshot.status === 'error') return
      const target = Math.max(0, Math.min(snapshot.durationMs, timeMs))
      try { video.currentTime = target / 1000 }
      catch { fail('The recorded video could not seek to this time. Retry the recorded source.'); return }
      if (target >= snapshot.durationMs) {
        wantsPlayback = false
        requestVersion += 1
        video.pause()
      }
      publish({ status: target >= snapshot.durationMs ? 'ended' : video.seeking ? 'buffering' : 'ready', ready: decoded(), playing: !video.paused })
    },
    setMuted(muted) {
      if (disposed) return
      video.muted = muted || options.audioAllowed?.() === false
      publish()
    },
    refreshAudioPolicy() { publish() },
    dispose() {
      if (disposed) return
      disposed = true
      wantsPlayback = false
      requestVersion += 1
      for (const [event, listener] of listeners) video.removeEventListener(event, listener)
      video.pause()
      video.removeAttribute('src')
      video.load()
    },
  }
}

export function createReplayVideoSession(video: HTMLVideoElement, url: string,
  onSnapshot: (snapshot: ReplayVideoSnapshot) => void, options: { audioAllowed?: () => boolean } = {}): ReplayVideoSession {
  return createReplayMediaSession(video, url, onSnapshot, options)
}
