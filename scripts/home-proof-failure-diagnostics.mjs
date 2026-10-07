import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

// Diagnostics retain route identity, never query credentials, headers or bodies.
export function diagnosticUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol)
      ? `${url.origin}${url.pathname}`.slice(0, 768)
      : url.protocol
  } catch {
    return 'invalid-url'
  }
}

export function homeProofNetworkLedger(page, limit = 128) {
  const ledger = { events: [], observed: 0, dropped: 0 }
  const retain = (event, request, status) => {
    ledger.observed += 1
    if (ledger.events.length >= limit) { ledger.dropped += 1; return }
    const row = { event, url: diagnosticUrl(request.url()), resourceType: request.resourceType() }
    if (status !== undefined) row.status = status
    ledger.events.push(row)
  }
  page.on('request', (request) => retain('started', request))
  page.on('response', (response) => retain('response', response.request(), response.status()))
  page.on('requestfinished', (request) => retain('finished', request))
  page.on('requestfailed', (request) => retain('failed', request))
  return ledger
}

export async function homeProofDomSnapshot({ frameBudgetMs = 500 } = {}) {
  const safeUrl = (value) => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? `${url.origin}${url.pathname}`.slice(0, 768) : url.protocol }
    catch { return 'invalid-url' }
  }
  const bounds = (element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return { width: rect.width, height: rect.height, display: style.display, visibility: style.visibility, opacity: style.opacity }
  }
  const owners = [...document.querySelectorAll('.urai-asset-home-world')].slice(0, 4).map((owner) => ({
    attributes: Object.fromEntries([...owner.attributes].filter((attribute) => attribute.name.startsWith('data-home-')).slice(0, 64).map((attribute) => [attribute.name, attribute.value.slice(0, 512)])),
    bounds: bounds(owner),
    canvases: [...owner.querySelectorAll('canvas')].slice(0, 4).map((canvas) => ({ width: canvas.width, height: canvas.height, bounds: bounds(canvas) })),
  }))
  const resourceTimings = performance.getEntriesByType('resource').slice(-64).map((entry) => ({
    url: safeUrl(entry.name), initiatorType: entry.initiatorType, startTime: entry.startTime,
    duration: entry.duration, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize,
  }))
  const frames = await new Promise((resolve) => {
    let observed = 0, request
    const started = performance.now()
    const finish = () => { clearTimeout(timer); cancelAnimationFrame(request); resolve({ observed, elapsedMs: performance.now() - started, budgetMs: frameBudgetMs }) }
    const tick = () => { observed += 1; if (observed >= 3) finish(); else request = requestAnimationFrame(tick) }
    const timer = setTimeout(finish, frameBudgetMs)
    request = requestAnimationFrame(tick)
  })
  return { url: safeUrl(location.href), readyState: document.readyState, visibilityState: document.visibilityState, owners, resourceTimings, frames }
}

async function bounded(label, operation, timeoutMs) {
  let timer
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} diagnostic timed out after ${timeoutMs}ms`)), timeoutMs) }),
    ])
  } finally { clearTimeout(timer) }
}

export async function retainHomeProofFailure(page, { outputDir, id, exactHead, stage, network, timeoutMs = 5_000 }) {
  const diagnostic = { schemaVersion: 'urai-home-proof-failure-1', stage, capturedAt: new Date().toISOString(), budgetMs: timeoutMs, network }
  // Capture both in parallel. An unresponsive page must not block later cases.
  const [dom, image] = await Promise.allSettled([
    bounded('DOM', () => page.evaluate(homeProofDomSnapshot, { frameBudgetMs: Math.min(500, timeoutMs / 2) }), timeoutMs),
    bounded('screenshot', () => page.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide', timeout: timeoutMs }), timeoutMs),
  ])
  if (dom.status === 'fulfilled') diagnostic.dom = dom.value
  else diagnostic.domError = String(dom.reason).slice(0, 768)
  if (image.status === 'fulfilled') {
    const fileName = `${id}-${exactHead.slice(0, 12)}-failure.png`
    try {
      await writeFile(path.join(outputDir, fileName), image.value)
      diagnostic.screenshot = { fileName, bytes: image.value.length, sha256: createHash('sha256').update(image.value).digest('hex'), acceptance: false }
    } catch (error) { diagnostic.screenshotError = String(error).slice(0, 768) }
  } else diagnostic.screenshotError = String(image.reason).slice(0, 768)
  return diagnostic
}
