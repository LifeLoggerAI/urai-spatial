import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const runtime = fs.readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const productionEntry = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.tsx', import.meta.url), 'utf8')
const production = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const manifest = fs.readFileSync(new URL('../src/spatial/assets/assetManifest.ts', import.meta.url), 'utf8')
const forge = fs.readFileSync(new URL('../../scripts/author-final-glb-pack.mjs', import.meta.url), 'utf8')
const verifier = fs.readFileSync(new URL('../../scripts/verify-final-glb-pack.mjs', import.meta.url), 'utf8')
const legacyVerifier = fs.readFileSync(new URL('../../scripts/verify-home-finalization-authored-assets.mjs', import.meta.url), 'utf8')

assert.match(runtime, /HomeWorldProduction/)
assert.match(productionEntry, /export \{ HomeWorldProductionPolished as HomeWorldProduction \} from "\.\/HomeWorldProductionPolished"/)
assert.match(production, /data-home-primary-owner="asset-driven"/)
assert.match(production, /data-home-real-world-first="true"/)
assert.match(production, /data-home-visible-portals="false"/)
assert.match(production, /home-authored-terrain/)
assert.match(production, /home-authored-embodied-self/)
assert.match(production, /home-orb-sanctuary/)
assert.match(production, /next === 'orb' && previousNearby !== 'orb'/)
assert.match(production, /yaw\.current = Math\.atan2\(dx, -dz\)/)
assert.match(production, /const orbPitch = Math\.atan2\(ORB\.y - camera\.position\.y, Math\.hypot\(ORB\.x - camera\.position\.x, ORB\.z - camera\.position\.z\)\)/)
assert.match(production, /pitch\.current = THREE\.MathUtils\.clamp\(orbPitch - attentionRestPitch - \.04, -\.85, \.18\)/)
assert.match(production, /position\.current\.y = homeWalkSurfaceHeight\(position\.current\.x, position\.current\.z\)/)
assert.match(production, /Math\.tan\(restPitch \+ pitch\.current \+ \.04\) \* lookDistance/)
assert.match(production, /Math\.atan2\(position\.current\.y \+ 1\.18 - camera\.position\.y, lookDistance\)/)
assert.doesNotMatch(production, /pitch\.current = THREE\.MathUtils\.clamp\(ORB\.y - 1\.22,/, 'Orb attention must account for the actual sloped walk surface')
assert.match(production, /This is not a camera lock/)
assert.match(production, /home-ground-environmental-threshold/)
assert.match(production, /home-life-map-sky-lookout/)
assert.doesNotMatch(production, /home-ground-portal-world-owned|home-life-map-portal-world-owned|<WorldPortal/)
assert.match(production, /irregular-authored-stone-no-proof-cylinders/)
assert.match(production, /irregular-stone-ring/)
assert.doesNotMatch(production, /cylinderGeometry args=\{\[1\.3,1\.5,\.5,48\]\}/)
assert.doesNotMatch(production, /cylinderGeometry args=\{\[\.7,\.78,\.2,56\]\}/)

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

const authoredFiles = [
  'home-entry-chamber-v1.glb',
  'portal-ring-master-v1.glb',
  'ground-world-terrain-v1.glb',
  'life-map-memory-star-v1.glb',
  'focus-memory-chamber-v1.glb',
  'replay-memory-environment-v1.glb',
  'urai-orb-avatar-v1.glb',
  'passport-status-room-v1.glb',
]
const authoredReceipt = JSON.parse(fs.readFileSync(new URL('../../operations/assets/generated-receipts/urai-final-glb-pack-v1.json', import.meta.url), 'utf8'))
assert.equal(authoredReceipt.packId, 'urai-final-glb-production-pack-v1')
assert.deepEqual(authoredReceipt.assets.map(asset => asset.fileName).sort(), [...authoredFiles].sort(), 'all eight governed assets must remain bound to their immutable receipt')
for (const fileName of authoredFiles) {
  const asset = authoredReceipt.assets.find(asset => asset.fileName === fileName)
  const bytes = fs.readFileSync(new URL(`../public/assets/urai/generated/models/${fileName}`, import.meta.url))
  assert.equal(bytes.length, asset.bytes, `${fileName}: governed byte count changed`)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `${fileName}: governed hash changed`)
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${fileName}: invalid GLB magic`)
  assert.equal(bytes.readUInt32LE(4), 2, `${fileName}: glTF2 identity changed`)
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${fileName}: incomplete GLB`)
  assert.match(verifier, new RegExp(fileName.replaceAll('.', '\\.')))
}

assert.match(forge, /production builds never generate substitute geometry/)
assert.match(forge, /immutable authored binary does not match its receipt/)
assert.match(forge, /generatedSubstitutes: 0/)
assert.match(forge, /receipt\.assets\.length !== 8/)
for (const extension of ['KHR_materials_emissive_strength', 'KHR_materials_transmission', 'KHR_materials_clearcoat']) assert.ok(verifier.includes(extension), `${extension} must remain governed by the native verifier`)
assert.match(verifier, /receipt hash mismatch/)
assert.match(verifier, /triangle budget exceeded/)
assert.match(verifier, /missing clip/)
assert.match(verifier, /missing node/)
assert.match(legacyVerifier, /visualApproval: false/)
assert.match(legacyVerifier, /Exact-head rendered inspection remains required/)

console.log('HOME_VISUAL_AUTHORITY_REPAIR_CONTRACT_PASSED')
