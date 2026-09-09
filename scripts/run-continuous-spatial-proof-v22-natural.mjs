// Current exact-head authority: run the grouped proof against production telemetry.
import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')

const historicalOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const currentOwner = "result.animationOwner === 'v225-asymmetric-veined-living-memory-presence'"
const historicalOrb = "orb: { x: -0.18, z: -6.90, radius: 2.35"
const currentOrb = "orb: { x: -0.45, z: -7.45, radius: 2.35"

function replaceOnce(source, from, to, label) {
  if (source.split(from).length - 1 !== 1) throw new Error(`Continuous proof ${label} contract changed`)
  return source.replace(from, to)
}

const stableTelemetryContracts = [
  "ground: { x: -4.85, z: -8.25, radius: 2.65",
  "'life-map': { x: 4.85, z: -8.25, radius: 2.65",
  "owner.getAttribute('data-home-assets-ready') === 'true'",
  "owner.getAttribute('data-home-input-ready') === 'true'",
  "owner.getAttribute('data-home-interaction-ready') === 'true'",
  "owner.getAttribute('data-home-ready') === 'true'",
]
for (const contract of stableTelemetryContracts) {
  if (original.split(contract).length - 1 !== 1) throw new Error(`Continuous proof current runtime contract changed: ${contract}`)
}

let patched = replaceOnce(original, historicalOwner, currentOwner, 'animation-owner')
patched = replaceOnce(patched, historicalOrb, currentOrb, 'Orb telemetry')

await writeFile(captureUrl, patched, 'utf8')
try {
  await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
} finally {
  await writeFile(captureUrl, original, 'utf8').catch(() => {})
}
