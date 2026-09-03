// Current exact-head authority: run the grouped proof against the production telemetry.
import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')

const sourceOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const runtimeOwner = "result.animationOwner === 'v93-dimensional-governed-sanctuary'"
if (original.split(sourceOwner).length - 1 !== 1) {
  throw new Error('Continuous proof animation-owner contract changed')
}

const telemetryContracts = [
  "orb: { x: -0.18, z: -6.90, radius: 2.35",
  "ground: { x: -4.85, z: -8.25, radius: 2.65",
  "'life-map': { x: 4.85, z: -8.25, radius: 2.65",
  "owner.getAttribute('data-home-assets-ready') === 'true'",
  "owner.getAttribute('data-home-input-ready') === 'true'",
  "owner.getAttribute('data-home-interaction-ready') === 'true'",
  "owner.getAttribute('data-home-ready') === 'true'",
]
for (const contract of telemetryContracts) {
  if (original.split(contract).length - 1 !== 1) {
    throw new Error(`Continuous proof current runtime contract changed: ${contract}`)
  }
}

const patched = original.replace(sourceOwner, runtimeOwner)
await writeFile(captureUrl, patched, 'utf8')
try {
  await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
} finally {
  await writeFile(captureUrl, original, 'utf8').catch(() => {})
}
