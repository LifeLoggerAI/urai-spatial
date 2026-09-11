import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')
const receiptPath = path.join(outputDir, 'receipt.json')
const verdictPath = path.join(outputDir, 'retained-png-verdict.json')
const receipt = JSON.parse(await (await import('node:fs/promises')).readFile(receiptPath, 'utf8'))

function isExpectedNavigationFontAbort(event) {
  return event?.kind === 'requestfailed'
    && /GET https:\/\/fonts\.gstatic\.com\/.*\.woff2 net::ERR_ABORTED$/.test(String(event?.text || ''))
}

const byId = new Map((receipt.captures || []).map((capture) => [capture.id, capture]))
const required = [
  'desktop-overview', 'selection-start', 'mid-travel', 'approach', 'stable-arrival',
  'keyboard-selection', 'portrait-mobile-overview', 'portrait-mobile-travel',
  'portrait-mobile-selected', 'portrait-tall-overview', 'portrait-tall-selected',
  'reduced-motion-arrival',
]

const highResolution = byId.get('desktop-overview-high-resolution')
if (!highResolution) throw new Error('missing dedicated high-resolution Founder capture')
if (!highResolution.signal || highResolution.signal.width < 4320 || highResolution.signal.height < 2700) {
  throw new Error(`high-resolution Founder capture dimensions drifted: ${JSON.stringify(highResolution.signal)}`)
}
if (!highResolution.screenshot) throw new Error('high-resolution Founder capture did not retain a PNG')
if (highResolution.signal.variance < 8
  || highResolution.signal.luminanceRange < 20
  || highResolution.signal.entropy < 1.2
  || highResolution.signal.edgeDensity < 0.03
  || highResolution.signal.occupiedQuadrants < 3) {
  throw new Error(`high-resolution Founder capture lacks distributed retained-pixel detail: ${JSON.stringify(highResolution.signal)}`)
}

const parallaxIds = ['desktop-overview', 'depth-travel-frame-1', 'depth-travel-frame-2', 'depth-travel-frame-3']
const hashes = new Set(parallaxIds.map((id) => byId.get(id)?.screenshot?.hash).filter(Boolean))
if (hashes.size < 3) throw new Error(`parallax proof produced duplicate captures; unique=${hashes.size}`)

const normalized = []
for (const id of required) {
  const capture = byId.get(id)
  if (!capture) throw new Error(`missing required capture ${id}`)
  if (capture.state?.renderReady !== 'true') throw new Error(`${id} did not prove a rendered production world`)
  if (Number(capture.state?.anchors || 0) < 8) throw new Error(`${id} visible anchor count below production minimum`)
  if (!capture.screenshot) throw new Error(`${id} did not retain a screenshot receipt`)
  if (!capture.signal) throw new Error(`${id} did not provide a WebGL signal`)
  if (capture.signal.sampleCount !== 3456) throw new Error(`${id} WebGL sample count drifted`)
  if (capture.signal.sampling !== 'distributed-grid-24x16-3x3') throw new Error(`${id} WebGL sampling method drifted`)
  if (capture.signal.variance >= 0 && capture.signal.variance < 8) throw new Error(`${id} WebGL pixel variance is below the visible-world minimum`)
  if (capture.signal.nonDarkRatio >= 0 && capture.signal.nonDarkRatio <= 0) throw new Error(`${id} WebGL non-dark coverage is empty`)
  if (capture.signal.luminanceRange < 20) throw new Error(`${id} retained pixels lack meaningful dynamic range`)
  if (capture.signal.entropy < 1.2) throw new Error(`${id} retained pixels lack meaningful luminance entropy`)
  if (capture.signal.edgeDensity < 0.03) throw new Error(`${id} retained pixels lack distributed spatial detail`)
  if (capture.signal.occupiedQuadrants < 3) throw new Error(`${id} rendered world lacks distributed viewport occupancy`)
  normalized.push({ id, width: capture.signal.width, height: capture.signal.height, signal: capture.signal })
}

const observedPhases = new Map([
  ['selection-start', 'departure'],
  ['mid-travel', 'travel'],
  ['approach', 'approach'],
  ['portrait-mobile-travel', 'travel'],
])
for (const [id, expectedPhase] of observedPhases) {
  const observed = byId.get(id)?.observedPhase
  if (observed?.phase !== expectedPhase || observed?.mode !== 'selected') {
    throw new Error(`${id} did not observe the authoritative ${expectedPhase} phase: ${JSON.stringify(observed)}`)
  }
}

const phases = required.map((id) => byId.get(id)?.captureState).filter(Boolean)
for (const phase of ['departure', 'travel', 'approach', 'arrival']) {
  if (!phases.includes(phase)) throw new Error(`Founder journey did not retain required phase: ${phase}`)
}

const blockingEvents = (receipt.browserEvents || []).filter((event) => !isExpectedNavigationFontAbort(event) && (
  event.kind === 'pageerror'
  || event.kind === 'requestfailed'
  || event.kind === 'http-error'
  || (event.kind === 'console:error' && !/favicon/i.test(String(event.text || '')))
))
if (blockingEvents.length) {
  throw new Error(`browser emitted ${blockingEvents.length} blocking console or network events: ${JSON.stringify(blockingEvents.slice(0, 8))}`)
}

if ((receipt.captures || []).length < 28) throw new Error(`Founder proof retained fewer than 28 captures: ${(receipt.captures || []).length}`)

const originalError = String(receipt.error || '')
const normalizedLegacyByteFailure = false
if (!receipt.passed) {
  throw new Error(`Founder runner failed for a non-normalizable reason: ${originalError || 'unknown failure'}`)
}

const verdict = {
  schemaVersion: 'urai-lifemap-founder-retained-png-verdict-1',
  exactHead: receipt.exactHead,
  runnerPassed: Boolean(receipt.passed),
  normalizedLegacyByteFailure,
  originalError: originalError || null,
  acceptance: 'pass',
  method: 'dimensions-plus-distributed-variance-dynamic-range-entropy-edge-density-and-occupancy',
  requiredCaptures: normalized,
}

await writeFile(verdictPath, JSON.stringify(verdict, null, 2))
console.log(`URAI_FOUNDER_RETAINED_PNG_VERDICT_OK ${JSON.stringify({ exactHead: receipt.exactHead, normalizedLegacyByteFailure })}`)
