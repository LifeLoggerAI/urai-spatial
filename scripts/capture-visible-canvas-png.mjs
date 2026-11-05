// Capture the browser's unmodified composite for exactly the visible canvas
// bounds. Like locator.screenshot, this may include UI composited over the
// canvas; it is retained visual evidence, not a raw WebGL framebuffer readback.
// Avoid locator.screenshot's scroll/stability animation-frame wait, which can
// starve on software WebGL even when the fixed canvas bounds are unchanged.
export const CANVAS_EVIDENCE_SAMPLE_POINTS = [[.12,.18],[.36,.18],[.64,.18],[.88,.18],[.12,.5],[.36,.5],[.64,.5],[.88,.5],[.12,.82],[.36,.82],[.64,.82],[.88,.82]]

async function inspectCanvasFromPage(page, selector, samplePoints) {
  return page.evaluate(({ selector, samplePoints }) => {
    const matches = [...document.querySelectorAll(selector)]
    const element = matches.length === 1 ? matches[0] : null
    if (!(element instanceof HTMLCanvasElement)) return { count: matches.length, visible: false, bounds: null, unoccluded: false }
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    return {
      count: matches.length,
      visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      bounds,
      unoccluded: samplePoints.every(([x, y]) => document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y) === element),
    }
  }, { selector, samplePoints })
}

export async function captureVisibleCanvasPng(page, canvas, timeoutMs = 90_000, samplePoints = CANVAS_EVIDENCE_SAMPLE_POINTS, directSelector = null) {
  if (!Array.isArray(samplePoints) || samplePoints.length < 1 || samplePoints.length > 64
    || samplePoints.some((point) => !Array.isArray(point) || point.length !== 2
      || point.some((value) => !Number.isFinite(value) || value < 0 || value > 1))) {
    throw new Error('Canvas capture requires finite bounded sampling points within the canvas')
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 90_000) throw new Error('Canvas capture requires a finite deadline between 1 and 90000 milliseconds')
  let deadline = Date.now() + timeoutMs
  const remaining = () => {
    const value = deadline - Date.now()
    if (value <= 0) throw new Error('Canvas capture exceeded its bounded deadline')
    return value
  }
  let bounds
  let unoccluded
  if (directSelector) {
    if (typeof directSelector !== 'string' || directSelector.length < 1 || directSelector.length > 256) throw new Error('Direct canvas selector must be a finite non-empty string')
    const before = await inspectCanvasFromPage(page, directSelector, samplePoints)
    remaining()
    if (before.count !== 1 || !before.visible) throw new Error('Canvas capture requires exactly one visible canvas')
    bounds = before.bounds
    unoccluded = before.unoccluded
  } else {
    await canvas.waitFor({ state: 'visible', timeout: remaining() })
    bounds = await canvas.boundingBox({ timeout: remaining() })
    unoccluded = await canvas.evaluate((element, points) => {
      if (!(element instanceof HTMLCanvasElement)) return false
      const rect = element.getBoundingClientRect()
      return points.every(([x, y]) => document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y) === element)
    }, samplePoints, { timeout: remaining() })
  }
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
  if (!unoccluded) throw new Error('Canvas evidence sample points are covered by another hit-testable element')
  const buffer = await page.screenshot({
    type: 'png', fullPage: false, clip, animations: 'disabled', caret: 'hide', timeout: timeoutMs,
  })
  deadline = Date.now() + timeoutMs
  const afterProbe = directSelector ? await inspectCanvasFromPage(page, directSelector, samplePoints) : null
  remaining()
  const after = afterProbe ? afterProbe.bounds : await canvas.boundingBox({ timeout: remaining() })
  if (!after || Object.keys(clip).some((key) => !Number.isFinite(after[key]) || Math.abs(after[key] - clip[key]) > .01)) {
    throw new Error('Canvas bounds changed during capture; retained pixels cannot be bound to the canvas')
  }
  const stillUnoccluded = afterProbe ? afterProbe.count === 1 && afterProbe.visible && afterProbe.unoccluded : await canvas.evaluate((element, points) => {
    if (!(element instanceof HTMLCanvasElement)) return false
    const rect = element.getBoundingClientRect()
    return points.every(([x, y]) => document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y) === element)
  }, samplePoints, { timeout: remaining() })
  if (!stillUnoccluded) throw new Error('Canvas evidence became covered during capture')
  return {
    buffer,
    capture: {
      source: 'visible-canvas-viewport-clip',
      pixelSource: 'unmodified-browser-composite',
      samplePoints,
      canvasTopmostAtSamplePoints: true,
      bounds,
      clip,
      viewport,
      viewportCoverage: bounds.width * bounds.height / (viewport.width * viewport.height),
      boundsUnchanged: true,
      canvasTopmostAfterCapture: true,
    },
  }
}

