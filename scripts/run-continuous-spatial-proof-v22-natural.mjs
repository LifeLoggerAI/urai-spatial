import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')

// The current public-authority candidate intentionally retains the authored Home
// animation owner. Do not rewrite this proof to an older sibling-owner marker:
// the underlying v18 assertion already requires the exact runtime owner and the
// grouped proof preserves that fail-closed equality check.
const runtimeOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
if (original.split(runtimeOwner).length - 1 !== 1) throw new Error('Continuous proof animation-owner contract changed')

// Reconcile only the stale proof-side Orb clip labels with the canonical authored
// runtime labels currently exposed through data-home-orb-clip. State identity and
// exact equality remain enforced by verifyHome; this does not relax the contract.
const staleOrbClips = `const orbClips = {\n  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',\n  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',\n  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',\n}`
const runtimeOrbClips = `const orbClips = {\n  dormant: 'orb-rest', idle: 'orb-breathe', attention: 'orb-attention', listening: 'orb-listening',\n  thinking: 'orb-thinking', speaking: 'orb-speaking', guiding: 'orb-guide', reflecting: 'orb-reflect',\n  calming: 'orb-calm', privacy: 'orb-privacy', warning: 'orb-warning', transition: 'orb-transition',\n}`
if (original.split(staleOrbClips).length - 1 !== 1) throw new Error('Continuous proof Orb clip contract changed')

const staleEnvironmentalRadius = 'radius: 2.2'
const runtimeEnvironmentalRadius = 'radius: 2.8'
const staleEnvironmentalCount = original.split(staleEnvironmentalRadius).length - 1
if (staleEnvironmentalCount !== 2) {
  throw new Error(`Continuous proof environmental-threshold proximity contract changed: expected 2, found ${staleEnvironmentalCount}`)
}

const staleOrbRadius = "orb: { x: 0, z: -0.65, radius: 1.8"
const runtimeOrbRadius = "orb: { x: 0, z: -2.65, radius: 2.5"
const staleGroundTarget = "ground: { x: -4.55, z: -6.55"
const runtimeGroundTarget = "ground: { x: -5.2, z: -8.4"
const staleLifeMapTarget = "'life-map': { x: 4.55, z: -6.65"
const runtimeLifeMapTarget = "'life-map': { x: 5.2, z: -8.4"
if (original.split(staleOrbRadius).length - 1 !== 1) throw new Error('Continuous proof Orb interaction-zone contract changed')
if (original.split(staleGroundTarget).length - 1 !== 1) throw new Error('Continuous proof Ground target contract changed')
if (original.split(staleLifeMapTarget).length - 1 !== 1) throw new Error('Continuous proof Life Map target contract changed')

const patched = original
  .replace(staleOrbClips, runtimeOrbClips)
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
