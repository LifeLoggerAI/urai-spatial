import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')

function count(source, token) {
  return source.split(token).length - 1
}

function convergeSingle(source, stale, current, label) {
  const staleCount = count(source, stale)
  const currentCount = count(source, current)
  if (staleCount === 1 && currentCount === 0) return source.replace(stale, current)
  if (staleCount === 0 && currentCount === 1) return source
  throw new Error(`${label} contract changed: stale=${staleCount}, current=${currentCount}`)
}

function convergeOneOf(source, staleValues, current, label) {
  const currentCount = count(source, current)
  const staleCounts = staleValues.map((value) => ({ value, count: count(source, value) }))
  const staleTotal = staleCounts.reduce((total, item) => total + item.count, 0)
  if (currentCount === 1 && staleTotal === 0) return source
  if (currentCount === 0 && staleTotal === 1) {
    const active = staleCounts.find((item) => item.count === 1)
    return source.replace(active.value, current)
  }
  throw new Error(`${label} contract changed: stale=${staleTotal}, current=${currentCount}`)
}

function convergeRepeated(source, stale, current, expectedCount, label) {
  const staleCount = count(source, stale)
  const currentCount = count(source, current)
  if (staleCount === expectedCount && currentCount === 0) return source.replaceAll(stale, current)
  if (staleCount === 0 && currentCount === expectedCount) return source
  throw new Error(`${label} contract changed: stale=${staleCount}, current=${currentCount}, expected=${expectedCount}`)
}

const oldOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const newOwner = "result.animationOwner === 'canonical-sanctuary-plus-cc0-fern-plus-living-orb'"
const staleEnvironmentalRadius = 'radius: 2.2'
const runtimeEnvironmentalRadius = 'radius: 2.8'
const staleOrbRadius = "orb: { x: 0, z: -0.65, radius: 1.8"
const transitionalOrbRadius = "orb: { x: 0, z: -2.65, radius: 1.8"
const previousOrbRadius = "orb: { x: 0, z: -2.65, radius: 2.5"
const runtimeOrbRadius = "orb: { x: 0, z: -4.25, radius: 2.4"
const staleGroundTarget = "ground: { x: -4.55, z: -6.55"
const previousGroundTarget = "ground: { x: -5.2, z: -8.4"
const runtimeGroundTarget = "ground: { x: -5.4, z: -10.8"
const staleLifeMapTarget = "'life-map': { x: 4.55, z: -6.65"
const previousLifeMapTarget = "'life-map': { x: 5.2, z: -8.4"
const runtimeLifeMapTarget = "'life-map': { x: 5.4, z: -10.8"

const authoredOrbClips = `const orbClips = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}`

let patched = original
patched = convergeSingle(patched, oldOwner, newOwner, 'Continuous proof animation-owner')
patched = convergeRepeated(patched, staleEnvironmentalRadius, runtimeEnvironmentalRadius, 2, 'Continuous proof environmental-threshold proximity')
patched = convergeOneOf(
  patched,
  [staleOrbRadius, transitionalOrbRadius, previousOrbRadius],
  runtimeOrbRadius,
  'Continuous proof Orb interaction-zone',
)
patched = convergeOneOf(patched, [staleGroundTarget, previousGroundTarget], runtimeGroundTarget, 'Continuous proof Ground target')
patched = convergeOneOf(patched, [staleLifeMapTarget, previousLifeMapTarget], runtimeLifeMapTarget, 'Continuous proof Life Map target')
if (count(patched, authoredOrbClips) !== 1) throw new Error('Continuous proof authored Orb clip contract changed')

await writeFile(captureUrl, patched, 'utf8')
try {
  await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
} finally {
  await writeFile(captureUrl, original, 'utf8').catch(() => {})
}
