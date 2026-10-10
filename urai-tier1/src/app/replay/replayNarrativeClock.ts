export type ReplayNarrativeSnapshot = { currentTimeMs: number; playing: boolean }

export type ReplayNarrativeClock = {
  toggle: () => void
  pause: () => void
  seek: (timeMs: number) => void
  dispose: () => void
}

/** The text/image timeline has one clock; media sources retain their own clock. */
export function createReplayNarrativeClock({ durationMs, onSnapshot, now, schedule, cancel }: {
  durationMs: number
  onSnapshot: (snapshot: ReplayNarrativeSnapshot) => void
  now: () => number
  schedule: (tick: () => void) => number
  cancel: (handle: number) => void
}): ReplayNarrativeClock {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0
  let currentTimeMs = 0
  let playing = false
  let disposed = false
  let anchor = 0
  let handle: number | null = null
  let generation = 0
  const publish = () => { if (!disposed) onSnapshot({ currentTimeMs, playing }) }
  const stopTimer = () => {
    generation += 1
    if (handle !== null) cancel(handle)
    handle = null
  }
  const sample = () => {
    const sampled = now()
    const elapsed = Number.isFinite(sampled) && Number.isFinite(anchor) ? Math.max(0, sampled - anchor) : 0
    if (Number.isFinite(sampled)) anchor = Math.max(anchor, sampled)
    currentTimeMs = Math.min(duration, currentTimeMs + elapsed)
    if (currentTimeMs >= duration) { playing = false; stopTimer() }
  }
  const pause = () => {
    if (disposed) return
    if (playing) sample()
    playing = false
    stopTimer()
    publish()
  }
  return {
    toggle() {
      if (disposed || duration === 0) return
      if (playing) { pause(); return }
      if (currentTimeMs >= duration) currentTimeMs = 0
      anchor = now()
      if (!Number.isFinite(anchor)) anchor = 0
      playing = true
      const version = ++generation
      handle = schedule(() => {
        if (disposed || !playing || version !== generation) return
        sample()
        publish()
      })
      publish()
    },
    pause,
    seek(timeMs) {
      if (disposed || !Number.isFinite(timeMs)) return
      currentTimeMs = Math.max(0, Math.min(duration, timeMs))
      const sampled = now()
      if (Number.isFinite(sampled)) anchor = sampled
      if (currentTimeMs >= duration) { playing = false; stopTimer() }
      publish()
    },
    dispose() {
      if (disposed) return
      disposed = true
      playing = false
      stopTimer()
    },
  }
}
