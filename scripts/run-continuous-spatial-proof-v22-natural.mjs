import { readFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const capture = await readFile(captureUrl, 'utf8')

const requiredMarkers = [
  "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'",
  "orb: { x: 0, z: -2.65, radius: 2.5",
  "ground: { x: -5.2, z: -8.4, radius: 2.8",
  "'life-map': { x: 5.2, z: -8.4, radius: 2.8",
  "dormant: 'Orb_Resting'",
  "transition: 'Orb_Transition'",
  "data-home-orb-model-clip",
]

for (const marker of requiredMarkers) {
  if (!capture.includes(marker)) {
    throw new Error(`Continuous proof current-runtime contract changed: missing ${marker}`)
  }
}

// v18 now targets the current Home interaction geometry and animation ownership
// directly. Do not rewrite its source at proof time: a proof harness must verify
// the checked-in candidate rather than manufacture a temporary alternate contract.
await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
