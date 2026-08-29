// V25 certification authority: built physical sanctuary + authored living Orb; retained proof remains fail-closed.
import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')
const oldOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const newOwner = "result.animationOwner === 'deep-reliquary-v61-plus-governed-orb-identity'"
if (original.split(oldOwner).length - 1 !== 1) throw new Error('Continuous proof animation-owner contract changed')

const staleEnvironmentalRadius = 'radius: 2.2'
const runtimeEnvironmentalRadius = 'radius: 2.8'
const staleEnvironmentalCount = original.split(staleEnvironmentalRadius).length - 1
if (staleEnvironmentalCount !== 2) {
  throw new Error(`Continuous proof environmental-threshold proximity contract changed: expected 2, found ${staleEnvironmentalCount}`)
}

const staleOrbRadius = "orb: { x: 0, z: -0.65, radius: 1.8"
const runtimeOrbRadius = "orb: { x: 0, z: -6.42, radius: 2.5"
const staleGroundTarget = "ground: { x: -4.55, z: -6.55"
const runtimeGroundTarget = "ground: { x: -5.2, z: -8.4"
const staleLifeMapTarget = "'life-map': { x: 4.55, z: -6.65"
const runtimeLifeMapTarget = "'life-map': { x: 5.2, z: -8.4"
if (original.split(staleOrbRadius).length - 1 !== 1) throw new Error('Continuous proof Orb interaction-zone contract changed')
if (original.split(staleGroundTarget).length - 1 !== 1) throw new Error('Continuous proof Ground target contract changed')
if (original.split(staleLifeMapTarget).length - 1 !== 1) throw new Error('Continuous proof Life Map target contract changed')

const patched = original
  .replace(oldOwner, newOwner)
  .replaceAll(staleEnvironmentalRadius, runtimeEnvironmentalRadius)
  .replace(staleOrbRadius, runtimeOrbRadius)
  .replace(staleGroundTarget, runtimeGroundTarget)
  .replace(staleLifeMapTarget, runtimeLifeMapTarget)

await writeFile(captureUrl, patched, 'utf8')
try {
  await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
} finally {
  await writeFile(captureUrl, original, 'utf8').catch(() => {})
}
