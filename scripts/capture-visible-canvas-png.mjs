// Capture the browser's unmodified composite for exactly the visible canvas
// bounds. Like locator.screenshot, this may include UI composited over the
// canvas; it is retained visual evidence, not a raw WebGL framebuffer readback.
// Avoid locator.screenshot's scroll/stability animation-frame wait, which can
// starve on software WebGL even when the fixed canvas bounds are unchanged.
export const CANVAS_EVIDENCE_SAMPLE_POINTS = [[.12,.18],[.36,.18],[.64,.18],[.88,.18],[.12,.5],[.36,.5],[.64,.5],[.88,.5],[.12,.82],[.36,.82],[.64,.82],[.88,.82]]

export async function captureVisibleCanvasPng(page, canvas, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  const remaining = () => {
    const value = deadline - Date.now()
    if (value <= 0) throw new Error('Canvas capture exceeded its bounded deadline')
    return value
  }
  await canvas.waitFor({ state: 'visible', timeout: remaining() })
  const bounds = await canvas.boundingBox({ timeout: remaining() })
  const viewport = page.viewportSize()
  if (!bounds || !viewport) throw new Error('Canvas capture requires visible canvas bounds and a viewport')
  if (![bounds.x, bounds.y, bounds.width, bounds.height, viewport.width, viewport.height].every(Number.isFinite)
    || bounds.width < 1 || bounds.height < 1 || viewport.width < 1 || viewport.height < 1) {
    throw new Error('Canvas capture bounds must be finite and non-empty')
  }
  if (bounds.x < 0 || bounds.y < 0
    || bounds.x + bounds.width > viewport.width
    || bounds.y + bounds.height > viewport.height) {
    throw new Error('Canvas must be fully within the viewport; partial or offscreen evidence is rejected')
  }
  const clip = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  const unoccluded = await canvas.evaluate((element, points) => {
    if (!(element instanceof HTMLCanvasElement)) return false
    const rect = element.getBoundingClientRect()
    return points.every(([x, y]) => document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y) === element)
  }, CANVAS_EVIDENCE_SAMPLE_POINTS, { timeout: remaining() })
  if (!unoccluded) throw new Error('Canvas evidence sample points are covered by another hit-testable element')
  const buffer = await page.screenshot({
    type: 'png', fullPage: false, clip, animations: 'disabled', caret: 'hide', timeout: remaining(),
  })
  const after = await canvas.boundingBox({ timeout: remaining() })
  if (!after || Object.keys(clip).some((key) => !Number.isFinite(after[key]) || Math.abs(after[key] - clip[key]) > .01)) {
    throw new Error('Canvas bounds changed during capture; retained pixels cannot be bound to the canvas')
  }
  return {
    buffer,
    capture: {
      source: 'visible-canvas-viewport-clip',
      pixelSource: 'unmodified-browser-composite',
      samplePoints: CANVAS_EVIDENCE_SAMPLE_POINTS,
      canvasTopmostAtSamplePoints: true,
      bounds,
      clip,
      viewport,
      viewportCoverage: bounds.width * bounds.height / (viewport.width * viewport.height),
      boundsUnchanged: true,
    },
  }
}
