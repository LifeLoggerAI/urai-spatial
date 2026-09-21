import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')

assert.ok(source.includes('const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";'), 'Life Map must retain the governed memory-star GLB as hidden source and animation authority')
assert.ok(source.includes('const governedAsset = useMemo(() => scene.clone(true), [scene]);'), 'Memory Star must preserve governed asset lineage')
assert.ok(source.includes('<primitive object={governedAsset} visible={false} />'), 'governed source asset must stay hidden while current stellar presentation owns visible pixels')
assert.ok(source.includes('name="memory-star-photosphere"'), 'Memory Star must expose a visible photosphere')
assert.ok(source.includes('name="memory-star-inner-corona"'), 'Memory Star must expose an inner corona')
assert.ok(source.includes('name="memory-star-outer-corona"'), 'Memory Star must expose an outer corona')
assert.ok(source.includes('artRevision: "v300-stellar-photosphere-corona"'), 'Memory Star must identify current stellar art authority')
assert.ok(source.includes('visualAuthority: "stellar-body-not-geology"'), 'Memory Star must explicitly reject geological authority')
assert.ok(source.includes('memoryIdentity: siteKey'), 'Memory Star must preserve selected-memory identity')
assert.ok(source.includes('<sphereGeometry args={[active ? 0.72 : 0.62, 72, 56]} />'), 'selected Memory Star must improve near-field photosphere readability')
assert.ok(source.includes('const particleCount = active ? 28 : 10;'), 'flare particles must remain subordinate to the photosphere')
assert.ok(source.includes('name="life-map-v237-grounded-geography-retired"'), 'superseded V237 valley must remain explicitly retired')
assert.ok(source.includes('retiredVisualRole: "former-memory-valley-not-current-galaxy-authority"'), 'retired geography must advertise its non-authoritative role')
assert.ok(!source.includes('life-map-weathered-memory-outcrop-'), 'weathered outcrops must not reclaim Memory Star presentation')
assert.ok(!source.includes("artRevision:'v237-grounded-semantic-outcrops'"), 'grounded semantic outcrops must remain superseded')
assert.ok(!/function MemorySeed\(|life-map-v215-rooted-strata-memory|function memoryLedgerGeometry\(/.test(source), 'rejected strata and shard-like memory presentations must not re-enter runtime')

console.log('Life Map Memory Star stellar presentation contract passed')
