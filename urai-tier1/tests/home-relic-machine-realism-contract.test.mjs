import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const provenancePath = new URL('../../operations/assets/home-v48-production-asset-provenance.json', import.meta.url)
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'))
const sceneStart = source.indexOf('function SacredFinalScene(')
const sceneEnd = source.indexOf('export function HomeWorldProductionFinal', sceneStart)
const sceneSource = source.slice(sceneStart, sceneEnd)
const architectureStart = source.indexOf('function ProductionSanctuary')
const architectureEnd = source.indexOf('function RecessedPractical', architectureStart)
const architectureSource = source.slice(architectureStart, architectureEnd)
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V48 renders committed external production assets instead of the deterministic intake chamber', () => {
  assert.match(source,/v48-production-asset-sanctuary-candidate/)
  assert.match(source,/root\.visible = false/)
  assert.match(source,/v48-deterministic-intake-glb-provenance-only-never-visible/)
  assert.match(sceneSource,/<ProductionSanctuary \/>/)
  assert.match(sceneSource,/<ProductionOrbMachine \/>/)
  assert.doesNotMatch(sceneSource,/<SanctuaryArchitecture \/>|<SanctuaryCeiling \/>|<OrbCradle \/>/)
})

test('V48 production sanctuary is asset-backed, not hero primitive geometry', () => {
  assert.match(architectureSource,/V48_ROCK_FACE_01/)
  assert.match(architectureSource,/V48_ROCK_FACE_02/)
  assert.match(architectureSource,/V48_PIPE_SYSTEM/)
  assert.match(architectureSource,/V48_CAGED_SCONCE/)
  assert.match(architectureSource,/home-v48-rear-scanned-apse/)
  assert.match(architectureSource,/home-v48-machine-services/)
  assert.doesNotMatch(architectureSource,/ExtrudeGeometry|boxGeometry|RoundedBox|coneGeometry|cylinderGeometry/)
})

test('V48 provenance is complete, local at runtime, CC0 and per-file hashed', () => {
  assert.equal(provenance.schema, 'urai.home.v48-production-assets.v1')
  assert.equal(provenance.runtimeFetchesPolyHavenApi, false)
  assert.equal(provenance.sourceAssets.length, 4)
  for (const asset of provenance.sourceAssets) {
    assert.equal(asset.license, 'CC0-1.0')
    assert.equal(asset.provider, 'Poly Haven')
    assert.ok(asset.entrypoint.startsWith('/assets/urai/home-production/cc0/polyhaven-v48/'))
    assert.ok(asset.files.length >= 1)
    for (const file of asset.files) {
      assert.match(file.sha256,/^[a-f0-9]{64}$/)
      assert.ok(file.bytes > 0)
      assert.ok(existsSync(file.path), `missing committed dependency ${file.path}`)
    }
  }
})

test('V48 keeps the authored Orb core visible inside a real asset-backed machine frame', () => {
  assert.match(source,/v48-governed-orb-core-heart-restored-no-crystalline-display/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.86\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.62\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.32\)/)
  assert.match(orbSource,/scale=\{1\.12\}/)
  assert.match(source,/home-v48-orb-machine-frame/)
  assert.match(source,/v48-asset-backed-machine-surrounds-authored-core-no-pedestal/)
  assert.doesNotMatch(orbSource,/MachineCoreAssembly/)
})

test('V48 has photographic floor, production framing and no source-level visual PASS claim', () => {
  assert.match(source,/home-v48-walkable-photographic-floor/)
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/desiredFov=portrait\?67:58/)
  assert.match(source,/gl\.toneMappingExposure=2\.08/)
  assert.match(source,/v48-production-assets-retained-pixel-candidate/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
