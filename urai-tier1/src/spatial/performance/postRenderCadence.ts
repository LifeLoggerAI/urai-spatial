export function shouldContinueHomeInteractiveCadence({
  reducedMotion,
  softwareRenderer,
  companionOpen,
  orbState,
  motionActive,
}: {
  reducedMotion: boolean
  softwareRenderer: boolean
  companionOpen: boolean
  orbState: string
  motionActive: boolean
}) {
  if (motionActive) return true
  if (reducedMotion) return false
  if (softwareRenderer && companionOpen && !['thinking', 'speaking'].includes(orbState)) return false
  return true
}

/** Demand-render pacing measured from a completed draw, not its request.
 * The caller must pair this root's useFrame with R3F's global after-render hook.
 */
export function createPostRenderCadence<Timer>({
  invalidate,
  intervalMs,
  schedule,
  cancel,
  shouldContinue = () => true,
}: {
  invalidate: () => void
  intervalMs: number
  schedule: (callback: () => void, delay: number) => Timer
  cancel: (timer: Timer) => void
  shouldContinue?: () => boolean
}) {
  let timer: Timer | undefined
  let renderedThisFrame = false
  let started = false
  let disposed = false

  const cancelPending = () => {
    if (timer !== undefined) cancel(timer)
    timer = undefined
  }

  return {
    start() {
      if (disposed || started) return
      started = true
      invalidate()
    },
    beforeRender() {
      if (disposed) return
      // User input or an asset load can trigger an earlier draw. Start its idle
      // interval after completion too, rather than keeping the old timer due.
      cancelPending()
      renderedThisFrame = true
    },
    afterRender() {
      // addAfterEffect is global: unrelated canvases must not drive this root.
      if (disposed || !renderedThisFrame) return
      renderedThisFrame = false
      if (!shouldContinue()) return
      timer = schedule(() => {
        timer = undefined
        if (!disposed) invalidate()
        // No timer is armed until this requested frame actually completes.
      }, intervalMs)
    },
    dispose() {
      disposed = true
      renderedThisFrame = false
      cancelPending()
    },
  }
}
