import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionFinal.tsx', import.meta.url), 'utf8')
const sceneStart = source.indexOf('function SacredFinalScene(')
const sceneEnd = source.indexOf('export function HomeWorldProductionFinal', sceneStart)
const sceneSource = source.slice(sceneStart, sceneEnd)
const orbStart = source.indexOf('function SacredOrb(')
const orbEnd = source.indexOf('function HumanPresence', orbStart)
const orbSource = source.slice(orbStart, orbEnd)

test('V48 restores the governed selected sanctuary as visible production world owner', () => {
  assert.match(source,/v48-governed-selected-assets-production-candidate/)
  assert.match(source,/root\.visible = true/)
  assert.match(source,/visibleWorldOwner = 'home-entry-chamber-v1\.glb'/)
  assert.match(source,/v48-governed-selected-sanctuary-visible-primary-world-owner/)
  assert.match(source,/home-entry-chamber-v1\.glb/)
  assert.doesNotMatch(sceneSource,/<SanctuaryArchitecture \/>|<SanctuaryCeiling \/>|<SanctuaryGlazing \/>/)
})

test('V48 removes the visible primitive court and V47 cabinet/slab machine lineage from production composition', () => {
  assert.doesNotMatch(source,/name="home-obsidian-walkable-terrain"/)
  assert.doesNotMatch(sceneSource,/<OrbPlatform \/>|<OrbCradle \/>|<FloorPanelJoints \/>|<ReflectingChannel/)
  assert.doesNotMatch(sceneSource,/<SanctuarySideGallery\/>|<MachineCavityLiner\/>|<ContinuousVaultSkin/)
  assert.match(source,/home-walkable-navigation-surface/)
})

test('V48 restores governed Orb core and heart while retiring crystalline display families', () => {
  assert.match(source,/object\.name === 'orb-core'/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.86\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.62\)/)
  assert.match(source,/object\.scale\.multiplyScalar\(0\.32\)/)
  assert.match(source,/v48-governed-orb-core-heart-restored-no-crystalline-display/)
  assert.match(orbSource,/scale=\{1\.12\}/)
  assert.match(orbSource,/v48-governed-orb-core-heart-restored-at-reliquary-scale/)
  assert.doesNotMatch(orbSource,/MachineCoreAssembly/)
})

test('V48 keeps real PBR/HDR environment and does not encode a visual PASS in source', () => {
  assert.match(source,/rock-tile-floor-diff-1k\.webp/)
  assert.match(source,/studio-small-08-1k\.hdr/)
  assert.match(source,/gl\.toneMappingExposure=1\.72/)
  assert.match(source,/desiredFov=portrait\?64:54/)
  assert.doesNotMatch(source,/PRODUCTION CERTIFIED|retained-pixel-pass|visual-pass/)
})

test('embodied presence remains privacy-preserving',()=>{
  assert.match(source,/function HumanPresence/)
  assert.match(source,/visible=\{false\}/)
})
