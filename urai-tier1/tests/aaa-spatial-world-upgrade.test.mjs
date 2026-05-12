import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const materials = read('src/spatial/visual/aaaMaterials.tsx')
const ground = read('src/scene/Ground.tsx')
const ritualPlatform = read('src/scene/RitualPlatform.tsx')
const particles = read('src/spatial/cinematic/CinematicParticles.tsx')
const post = read('src/spatial/cinematic/CinematicPostProcessing.tsx')
const model = read('src/spatial/world/uraiSpatialWorldModel.ts')

test('AAA spatial material system exposes moonlit sacred-tech rendering primitives', () => {
  for (const token of [
    'AAA_MOONLIT_PALETTE',
    'MoonlitBlackStoneMaterial',
    'SacredGlassMaterial',
    'SealedProgressionMaterial',
    'MistLightMaterial',
    'makeProceduralStoneNormalTexture',
    'resolveSpatialRenderBudget',
  ]) {
    assert.match(materials, new RegExp(token))
  }
})

test('home ground upgrades from flat planes to reflective black-stone world floor', () => {
  assert.match(ground, /data-testid="urai-reflective-black-stone-ground"/)
  assert.match(ground, /meshPhysicalMaterial/)
  assert.match(ground, /normalMap/)
  assert.match(ground, /ReflectionPool/)
  assert.match(ground, /MoonlitVeins/)
  assert.match(ground, /HorizonMist/)
  assert.match(ground, /reflectionMode/)
})

test('ritual platform has world-native lock markers and stronger material language', () => {
  assert.match(ritualPlatform, /data-testid="urai-aaa-ritual-platform"/)
  assert.match(ritualPlatform, /data-testid="urai-world-native-progression-locks"/)
  assert.match(ritualPlatform, /SealedProgressionMaterial/)
  assert.match(ritualPlatform, /EngravedStoneVeins/)
  assert.match(ritualPlatform, /OrbReflection/)
  assert.match(ritualPlatform, /reflectionMode/)
})

test('atmosphere and postprocessing are quality-tier aware', () => {
  assert.match(particles, /data-testid="urai-atmospheric-field"/)
  assert.match(particles, /ATMOSPHERIC_LAYERS/)
  assert.match(particles, /particleBudget/)
  assert.match(particles, /low-mist/)
  assert.match(particles, /rare-sacred-motes/)
  assert.match(post, /SpatialRenderBudget/)
  assert.match(post, /DepthOfField/)
  assert.match(post, /chromaticAberrationEnabled/)
})

test('world model carries AAA render budgets, progression locks, and non-flat Life Map camera', () => {
  assert.match(model, /type UraiSpatialRenderBudget/)
  assert.match(model, /URAI_SPATIAL_RENDER_BUDGETS/)
  assert.match(model, /URAI_PROGRESSION_LOCKS/)
  assert.match(model, /renderBudgetsCoverQualityTiers/)
  assert.match(model, /locksAreWorldNative/)
  assert.doesNotMatch(model, /lifeMap: \{\s*position: \[0, 0, 900\]/)
  assert.match(model, /lifeMap: \{[\s\S]*?position: \[0, 18, 128\]/m)
})
