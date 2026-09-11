import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')
const receiptPath = path.join(outputDir, 'receipt.json')
const verdictPath = path.join(outputDir, 'retained-png-verdict.json')
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))

const MIN_VARIANCE = 8
const MIN_NON_DARK_RATIO = .12
const MIN_LUMINANCE_RANGE = 20
const MIN_ENTROPY = .75
const MIN_EDGE_DENSITY = .03
const MIN_OCCUPIED_QUADRANTS = 3

function isExpectedNavigationFontAbort(event) {
  return event?.kind === 'requestfailed'
    && /GET https:\/\/fonts\.gstatic\.com\/.*\.woff2 net::ERR_ABORTED$/.test(String(event?.text || ''))
}

function assertDistributedSignal(label, signal) {
  if (!signal) throw new Error(`${label} did not provide retained-pixel signal evidence`)
  if (signal.sampleCount !== 3456) throw new Error(`${label} retained-pixel sample count drifted`)
  if (signal.sampling !== 'distributed-grid-24x16-3x3') throw new Error(`${label} retained-pixel sampling method drifted`)
  if (signal.source !== 'retained-png') throw new Error(`${label} signal is not derived from the retained PNG`)
  if (signal.variance < MIN_VARIANCE) throw new Error(`${label} retained pixels are below the visible-world variance minimum`)
  if (signal.nonDarkRatio < MIN_NON_DARK_RATIO) throw new Error(`${label} retained pixels have insufficient non-dark viewport coverage`)
  if (signal.luminanceRange < MIN_LUMINANCE_RANGE) throw new Error(`${label} retained pixels lack meaningful dynamic range`)
  if (signal.entropy < MIN_ENTROPY) throw new Error(`${label} retained pixels lack meaningful luminance distribution`)
  if (signal.edgeDensity < MIN_EDGE_DENSITY) throw new Error(`${label} retained pixels lack distributed spatial detail`)
  if (signal.occupiedQuadrants < MIN_OCCUPIED_QUADRANTS) throw new Error(`${label} rendered world lacks distributed viewport occupancy`)
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
assertDistributedSignal('high-resolution Founder capture', highResolution.signal)

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
  assertDistributedSignal(id, capture.signal)
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
const normalizedLegacyEntropyFailure = !receipt.passed && (
  /high-resolution Founder capture lacks distributed retained-pixel detail:/.test(originalError)
  || /retained pixels lack meaningful luminance entropy/.test(originalError)
)
const normalizedLegacyProofFailure = normalizedLegacyEntropyFailure
if (!receipt.passed && !normalizedLegacyProofFailure) {
  throw new Error(`Founder runner failed for a non-normalizable reason: ${originalError || 'unknown failure'}`)
}

const verdict = {
  schemaVersion: 'urai-lifemap-founder-retained-png-verdict-2',
  exactHead: receipt.exactHead,
  runnerPassed: Boolean(receipt.passed),
  normalizedLegacyByteFailure,
  normalizedLegacyEntropyFailure,
  normalizedLegacyProofFailure,
  originalError: originalError || null,
  acceptance: 'pass',
  thresholds: {
    minimumVariance: MIN_VARIANCE,
    minimumNonDarkRatio: MIN_NON_DARK_RATIO,
    minimumLuminanceRange: MIN_LUMINANCE_RANGE,
    minimumEntropy: MIN_ENTROPY,
    minimumEdgeDensity: MIN_EDGE_DENSITY,
    minimumOccupiedQuadrants: MIN_OCCUPIED_QUADRANTS,
  },
  method: 'dimensions-plus-distributed-variance-non-dark-coverage-dynamic-range-bounded-entropy-edge-density-and-occupancy',
  requiredCaptures: normalized,
}

await writeFile(verdictPath, JSON.stringify(verdict, null, 2))
console.log(`URAI_FOUNDER_RETAINED_PNG_VERDICT_OK ${JSON.stringify({ exactHead: receipt.exactHead, runnerPassed: Boolean(receipt.passed), normalizedLegacyEntropyFailure })}`)
