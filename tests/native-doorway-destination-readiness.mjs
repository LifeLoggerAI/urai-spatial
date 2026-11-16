// Read the existing production renderer proof. Route hydration alone is insufficient.
// This function is serialized by Playwright; keep its dependencies in the browser.
export function readSettledLifeMapRendererSnapshot() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/'
  const owners = document.querySelectorAll('[data-testid="urai-true-3d-life-map"]')
  if (pathname !== '/life-map' || owners.length !== 1) return null
  const root = owners[0]
  const canvases = root.querySelectorAll('canvas')
  if (canvases.length !== 1) return null
  const canvas = canvases[0]
  const objects = Number(root.getAttribute('data-life-map-visible-objects') || 0)
  const anchors = Number(root.getAttribute('data-life-map-visible-anchors') || 0)
  const calls = Number(root.getAttribute('data-life-map-render-calls') || 0)
  const triangles = Number(root.getAttribute('data-life-map-render-triangles') || 0)
  const renderReady = root.getAttribute('data-life-map-render-ready') === 'true'
  if (!renderReady || ![objects, anchors, calls, triangles].every(Number.isFinite)
    || objects <= 20 || anchors < 8 || calls <= 0 || canvas.width <= 0 || canvas.height <= 0) return null
  return {
    pathname, renderReady, visibleObjects: objects, visibleAnchors: anchors,
    renderCalls: calls, renderTriangles: triangles,
    canvasCount: canvases.length, canvasWidth: canvas.width, canvasHeight: canvas.height,
    sourceMode: root.getAttribute('data-life-map-source'),
    phase: root.getAttribute('data-life-map-phase'),
    privateMemoryMounted: document.querySelector('[data-testid="urai-r3f-canonical-lifemap"]')?.getAttribute('data-private-memory-mounted') ?? null,
  }
}

export async function waitForLifeMapDestination(page, timeout = 30_000) {
  const ready = await page.waitForFunction(readSettledLifeMapRendererSnapshot, null, { timeout, polling: 50 })
  const before = await ready.jsonValue()
  await ready.dispose()
  // Require painted browser frames after renderer readiness. A timeout is a failure.
  await page.evaluate(() => new Promise((resolve, reject) => {
    let frames = 0
    const timeoutId = window.setTimeout(() => reject(new Error('Life Map destination did not paint four settled browser frames')), 10_000)
    const tick = () => {
      frames += 1
      if (frames >= 4) { window.clearTimeout(timeoutId); resolve() }
      else window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  }))
  const after = await page.evaluate(readSettledLifeMapRendererSnapshot)
  if (!after) throw new Error('Life Map renderer readiness was lost before retained capture')
  return { status: 'render-ready', before, after, settledBrowserFrames: 4 }
}
