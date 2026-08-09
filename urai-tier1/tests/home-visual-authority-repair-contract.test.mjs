import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime = fs.readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const productionEntry = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.tsx', import.meta.url), 'utf8')
const production = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../src/spatial/assets/assetManifest.ts', import.meta.url), 'utf8')
const forge = fs.readFileSync(new URL('../../scripts/author-final-glb-pack.mjs', import.meta.url), 'utf8')
const verifier = fs.readFileSync(new URL('../../scripts/verify-final-glb-pack.mjs', import.meta.url), 'utf8')
const legacyVerifier = fs.readFileSync(new URL('../../scripts/verify-home-finalization-authored-assets.mjs', import.meta.url), 'utf8')

assert.match(runtime, /HomeWorldProduction/)
assert.match(productionEntry, /export \{ HomeWorldProductionFinal as HomeWorldProduction \} from "\.\/HomeWorldProductionFinal"/)
assert.match(production, /data-home-primary-owner="asset-driven"/)
assert.match(production, /data-home-real-world-first="true"/)
assert.match(production, /data-home-visible-portals="false"/)
assert.match(production, /home-authored-terrain/)
assert.match(production, /home-authored-embodied-self/)
assert.match(production, /home-orb-sanctuary/)
assert.match(production, /home-ground-environmental-threshold/)
assert.match(production, /home-life-map-sky-lookout/)
assert.doesNotMatch(production, /home-ground-portal-world-owned|home-life-map-portal-world-owned|<WorldPortal/)

for (const id of [
  'home-entry-chamber-model-v1',
  'portal-ring-master-glb-v1',
  'ground-world-terrain-glb-v1',
  'life-map-memory-star-glb-v1',
  'focus-memory-chamber-glb-v1',
  'replay-memory-environment-glb-v1',
  'urai-orb-avatar-glb-v1',
  'passport-status-room-glb-v1',
]) {
  assert.match(manifest, new RegExp(`finalGlb\\('${id}'`))
}
assert.match(manifest, /status: 'ready'/)
assert.match(manifest, /Rendered visual acceptance remains an exact-head review gate/)

for (const fileName of [
  'home-entry-chamber-v1.glb',
  'portal-ring-master-v1.glb',
  'ground-world-terrain-v1.glb',
  'life-map-memory-star-v1.glb',
  'focus-memory-chamber-v1.glb',
  'replay-memory-environment-v1.glb',
  'urai-orb-avatar-v1.glb',
  'passport-status-room-v1.glb',
]) {
  assert.match(forge, new RegExp(fileName.replaceAll('.', '\\.')))
  assert.match(verifier, new RegExp(fileName.replaceAll('.', '\\.')))
}

assert.match(forge, /URAI Labs Final GLB Forge 1\.0/)
assert.match(forge, /KHR_materials_emissive_strength/)
assert.match(forge, /KHR_materials_transmission/)
assert.match(forge, /KHR_materials_clearcoat/)
assert.match(verifier, /receipt hash mismatch/)
assert.match(verifier, /triangle budget exceeded/)
assert.match(verifier, /missing clip/)
assert.match(verifier, /missing node/)
assert.match(legacyVerifier, /visualApproval: false/)
assert.match(legacyVerifier, /Exact-head rendered inspection remains required/)

console.log('HOME_VISUAL_AUTHORITY_REPAIR_CONTRACT_PASSED')
