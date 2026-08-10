import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')
const oldOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const newOwner = "result.animationOwner === 'natural-terrain-plus-cc0-fern-plus-living-orb'"
if (original.split(oldOwner).length - 1 !== 1) throw new Error('Continuous proof animation-owner contract changed')

const staleEnvironmentalRadius = 'radius: 2.2'
const runtimeEnvironmentalRadius = 'radius: 2.45'
const staleEnvironmentalCount = original.split(staleEnvironmentalRadius).length - 1
if (staleEnvironmentalCount !== 2) {
  throw new Error(`Continuous proof environmental-threshold proximity contract changed: expected 2, found ${staleEnvironmentalCount}`)
}

const staleOrbTarget = 'orb: { x: 0, z: -0.65'
const runtimeOrbTarget = 'orb: { x: 0, z: -4.25'
const staleGroundTarget = "ground: { x: -4.55, z: -6.55"
const runtimeGroundTarget = "ground: { x: -5.4, z: -10.8"
const staleLifeMapTarget = "'life-map': { x: 4.55, z: -6.65"
const runtimeLifeMapTarget = "'life-map': { x: 5.4, z: -10.8"
if (original.split(staleOrbTarget).length - 1 !== 1) throw new Error('Continuous proof Orb target contract changed')
if (original.split(staleGroundTarget).length - 1 !== 1) throw new Error('Continuous proof Ground target contract changed')
if (original.split(staleLifeMapTarget).length - 1 !== 1) throw new Error('Continuous proof Life Map target contract changed')

const patched = original
  .replace(oldOwner, newOwner)
  .replaceAll(staleEnvironmentalRadius, runtimeEnvironmentalRadius)
  .replace(staleOrbTarget, runtimeOrbTarget)
  .replace(staleGroundTarget, runtimeGroundTarget)
  .replace(staleLifeMapTarget, runtimeLifeMapTarget)

await writeFile(captureUrl, patched, 'utf8')
try {
  await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
} finally {
  await writeFile(captureUrl, original, 'utf8').catch(() => {})
}
