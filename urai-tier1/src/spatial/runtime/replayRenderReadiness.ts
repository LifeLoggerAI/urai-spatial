type ReplayCanvas = Pick<HTMLCanvasElement, 'addEventListener' | 'removeEventListener'>

/** Readiness belongs to one live renderer, never to a previous canvas lifecycle. */
export function createReplayRenderReadiness(
  canvas: ReplayCanvas,
  contextLost: () => boolean,
  publish: (ready: boolean) => void,
) {
  let frames = 0
  let lastRenderFrame = 0
  let connected = false
  const reset = () => { frames = 0; lastRenderFrame = 0; publish(false) }
  return {
    reset,
    connect() {
      connected = true
      reset()
      canvas.addEventListener('webglcontextlost', reset)
      canvas.addEventListener('webglcontextrestored', reset)
      return () => {
        connected = false
        canvas.removeEventListener('webglcontextlost', reset)
        canvas.removeEventListener('webglcontextrestored', reset)
        reset()
      }
    },
    frame(renderFrame: number) {
      if (!connected || contextLost() || renderFrame <= 0) { reset(); return }
      if (renderFrame === lastRenderFrame) return
      lastRenderFrame = renderFrame
      frames += 1
      publish(frames >= 2)
    },
  }
}
