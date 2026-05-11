import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('Life Map uses authored memory artifacts instead of final sphere-only nodes', async () => {
  const constellation = await source('src/spatial/constellation/ConstellationLayer.tsx')
  const artifact = await source('src/spatial/artifacts/MemoryArtifactNode.tsx')

  assert.match(constellation, /MemoryArtifactNode/)
  assert.match(constellation, /artifactRarity/)
  assert.match(artifact, /octahedronGeometry/)
  assert.match(artifact, /icosahedronGeometry/)
  assert.match(artifact, /SealedProgressionMaterial/)
})

test('Focus and Replay have world-layer components wired through canonical experience', async () => {
  const focus = await source('src/scene/FocusChamber.tsx')
  const replay = await source('src/scene/ReplayTemporalField.tsx')
  const wrapper = await source('src/scene/UraiIntegratedHomeScene.tsx')
  const tierOne = await source('src/spatial/layout/TierOneExperience.tsx')

  assert.match(focus, /data-testid="urai-focus-chamber"/)
  assert.match(focus, /SacredGlassMaterial/)
  assert.match(focus, /MistLightMaterial/)
  assert.match(replay, /data-testid="urai-replay-temporal-field"/)
  assert.match(replay, /CatmullRomCurve3/)
  assert.match(replay, /replayProgress/)
  assert.match(wrapper, /<HomeScene sceneMode=\{sceneMode\}/)
  assert.match(wrapper, /<FocusChamber active/)
  assert.match(wrapper, /<ReplayTemporalField active/)
  assert.match(wrapper, /resolveSpatialRenderBudget/)
  assert.match(tierOne, /UraiIntegratedHomeScene/)
  assert.doesNotMatch(tierOne, /import HomeScene from/)
})

test('Home ground and ritual platform consume AAA render budget defaults', async () => {
  const ground = await source('src/scene/Ground.tsx')
  const platform = await source('src/scene/RitualPlatform.tsx')

  assert.match(ground, /resolveSpatialRenderBudget/)
  assert.match(ground, /useReducedMotion/)
  assert.match(ground, /data-render-budget-reflection-mode=\{effectiveReflectionMode\}/)
  assert.match(ground, /ReflectionPool reflectionMode=\{effectiveReflectionMode\}/)

  assert.match(platform, /resolveSpatialRenderBudget/)
  assert.match(platform, /useReducedMotion/)
  assert.match(platform, /data-render-budget-reflection-mode=\{effectiveReflectionMode\}/)
  assert.match(platform, /OrbReflection reflectionMode=\{effectiveReflectionMode\}/)
})

test('Particles and postprocessing consume AAA render budget defaults', async () => {
  const particles = await source('src/spatial/cinematic/CinematicParticles.tsx')
  const post = await source('src/spatial/cinematic/CinematicPostProcessing.tsx')

  assert.match(particles, /resolveSpatialRenderBudget/)
  assert.match(particles, /useReducedMotion/)
  assert.match(particles, /const resolvedBudget = useMemo/)
  assert.match(particles, /data-render-budget-particle-budget=\{particleBudget\}/)
  assert.match(particles, /data-render-budget-atmosphere-mode=\{resolvedBudget\.atmosphereMode\}/)
  assert.doesNotMatch(particles, /budget\?\.particleBudget \?\? \(reducedMotion \? 220 : 940\)/)

  assert.match(post, /resolveSpatialRenderBudget/)
  assert.match(post, /useReducedMotion/)
  assert.match(post, /const resolvedBudget = useMemo/)
  assert.match(post, /data-render-budget-quality-tier=\{qualityTier\}/)
  assert.match(post, /data-render-budget-bloom-enabled=\{bloomEnabled \? 'true' : 'false'\}/)
  assert.doesNotMatch(post, /budget\?\.qualityTier \?\? \(reducedMotion \? 'low' : 'high'\)/)
})
