import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EVENT_LIMIT = 64
const SCREENSHOT_LIMIT = 4 * 1024 * 1024
const DIAGNOSTIC_TIMEOUT_MS = 3000

export function diagnosticUrl(value) {
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)) return '[non-http]'
    return `${url.origin}${url.pathname}`.slice(0, 512)
  } catch { return '[invalid-url]' }
}

export async function attachHomeOrbFailureProbe(page) {
  const events = []
  let droppedEvents = 0
  const add = (event) => {
    if (events.length >= EVENT_LIMIT) { droppedEvents += 1; return }
    events.push(event)
  }
  const response = (value) => add({ kind: 'response', url: diagnosticUrl(value.url()), status: value.status() })
  const finished = (value) => add({ kind: 'request-finished', url: diagnosticUrl(value.url()) })
  const failed = (value) => add({ kind: 'request-failed', url: diagnosticUrl(value.url()) })
  const consoleMessage = (value) => {
    const kind = value.type()
    if (!['warning', 'error'].includes(kind)) return
    const text = value.text()
    const category = ['webgl', 'context', 'shader', 'asset', 'network'].find((name) => text.toLowerCase().includes(name)) || 'other'
    add({ kind: 'console', level: kind, category, messageSuppressed: true })
  }
  const listeners = [['response', response], ['requestfinished', finished], ['requestfailed', failed], ['console', consoleMessage]]
  for (const [name, listener] of listeners) page.on(name, listener)
  await page.addInitScript(() => {
    const state = { frames: 0, lastFrameAt: null, contextLost: 0, contextRestored: 0, visibilityChanges: 0 }
    Object.defineProperty(window, '__uraiHomeOrbFailureProbe', { value: state, configurable: true })
    document.addEventListener('webglcontextlost', () => { state.contextLost += 1 }, true)
    document.addEventListener('webglcontextrestored', () => { state.contextRestored += 1 }, true)
    document.addEventListener('visibilitychange', () => { state.visibilityChanges += 1 })
    const tick = (time) => {
      state.frames += 1
      state.lastFrameAt = time
      if (state.frames < 600) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  return {
    snapshot: () => ({ events: events.slice(), droppedEvents, limit: EVENT_LIMIT }),
    stop: () => { for (const [name, listener] of listeners) page.off(name, listener) },
  }
}

async function bounded(operation) {
  let timer
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('diagnostic-timeout')), DIAGNOSTIC_TIMEOUT_MS) }),
    ])
  } finally { clearTimeout(timer) }
}

export async function captureHomeOrbFailure(page, { outputDir, prefix, stage, probe }) {
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(prefix)) throw new Error('invalid-diagnostic-prefix')
  const result = {
    schemaVersion: 'urai-home-orb-failure-diagnostics-v1',
    stage,
    acceptance: false,
    runtimeReadinessVerified: false,
    network: probe.snapshot(),
    errors: [],
    rendererSceneNames: 'not-exposed-to-this-browser-probe',
    frameMeaning: 'document-animation-heartbeat-only-not-renderer-readiness',
  }
  try {
    result.browser = await bounded(() => page.evaluate(() => {
      const owner = document.querySelector('.urai-asset-home-world')
      const attributes = owner
        ? Object.fromEntries([...owner.attributes].filter((attribute) => attribute.name.startsWith('data-home-')).map((attribute) => [attribute.name, attribute.value.slice(0, 512)]))
        : null
      const canvases = [...document.querySelectorAll('canvas')].slice(0, 8).map((canvas) => {
        const bounds = canvas.getBoundingClientRect()
        return { width: canvas.width, height: canvas.height, cssWidth: bounds.width, cssHeight: bounds.height }
      })
      return {
        ownerPresent: Boolean(owner), attributes, canvases,
        visibility: document.visibilityState,
        now: performance.now(),
        heartbeatAndContextEvents: window.__uraiHomeOrbFailureProbe || null,
        deviceMemory: navigator.deviceMemory ?? null,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        coarsePointer: matchMedia('(pointer: coarse)').matches,
        viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
      }
    }))
  } catch { result.errors.push('browser-snapshot-unavailable') }
  try {
    const bytes = await bounded(() => page.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide', timeout: DIAGNOSTIC_TIMEOUT_MS }))
    result.screenshotBytes = bytes.length
    result.screenshotSha256 = createHash('sha256').update(bytes).digest('hex')
    if (bytes.length <= SCREENSHOT_LIMIT) {
      result.screenshot = `${prefix}-failure.png`
      await mkdir(outputDir, { recursive: true })
      await writeFile(path.join(outputDir, result.screenshot), bytes)
    } else result.screenshotOmitted = 'exceeds-4MiB-diagnostic-budget'
  } catch { result.errors.push('failure-screenshot-unavailable') }
  await mkdir(outputDir, { recursive: true })
  result.file = `${prefix}-failure.json`
  await writeFile(path.join(outputDir, result.file), `${JSON.stringify(result, null, 2)}\n`)
  return result
}
