export type CapturedRealityPixelProbe = {
  context: WebGLRenderingContext | WebGL2RenderingContext
  width: number
  height: number
  background: readonly [number, number, number, number]
  minimumDelta?: number
  minimumMeaningfulSamples?: number
}

/**
 * Samples a bounded grid from the current framebuffer. This proves that the
 * completed Gaussian draw produced pixels that differ materially from the
 * renderer clear color without retaining screenshots or private frame data.
 */
export function capturedRealityFrameHasMeaningfulPixels({
  context,
  width,
  height,
  background,
  minimumDelta = 24,
  minimumMeaningfulSamples = 2,
}: CapturedRealityPixelProbe) {
  if (
    context.isContextLost() ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 3 ||
    height < 3
  ) return false

  const pixel = new Uint8Array(4)
  const xFractions = [.08, .2, .35, .5, .65, .8, .92]
  const yFractions = [.08, .25, .5, .75, .92]
  let meaningful = 0

  for (const yf of yFractions) {
    const y = Math.min(height - 1, Math.max(0, Math.floor((height - 1) * yf)))
    for (const xf of xFractions) {
      const x = Math.min(width - 1, Math.max(0, Math.floor((width - 1) * xf)))
      context.readPixels(x, y, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel)
      const delta = Math.max(
        Math.abs(pixel[0] - background[0]),
        Math.abs(pixel[1] - background[1]),
        Math.abs(pixel[2] - background[2]),
        Math.abs(pixel[3] - background[3]),
      )
      if (delta >= minimumDelta && ++meaningful >= minimumMeaningfulSamples) return true
    }
  }
  return false
}
