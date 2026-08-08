import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

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

test('Focus and Replay retain dedicated canonical route owners without a multi-mode shell', async () => {
  const focusPage = await source('src/app/focus/page.tsx')
  const replayPage = await source('src/app/replay/page.tsx')
  const focusClient = await source('src/app/focus/FocusChamberClient.tsx')
  const replayClient = await source('src/app/replay/CinematicReplayClient.tsx')

  assert.match(focusPage, /FinalFocusChamber/)
  assert.match(replayPage, /FinalReplayFilm/)
  assert.match(focusClient, /requestUraiWorldReturn/)
  assert.match(replayClient, /requestUraiWorldReturn/)
  assert.equal(existsSync(new URL('../src/spatial/layout/TierOneExperience.tsx', import.meta.url)), false)
})

test('Home ground and ritual platform consume AAA render budget defaults', async () => {
  const ground = await source('src/scene/Ground.tsx')
  const platform = await source('src/scene/RitualPlatform.tsx')

  assert.match(ground, /resolveSpatialRenderBudget/)
  assert.match(ground, /useReducedMotion/)
  assert.match(ground, /useSharedHomeSceneVisualBudget/)
  assert.match(ground, /sharedVisualBudget\?\.budget/)
  assert.match(ground, /data-render-budget-reflection-mode=\{effectiveReflectionMode\}/)
  assert.match(ground, /ReflectionPool reflectionMode=\{effectiveReflectionMode\}/)

  assert.match(platform, /resolveSpatialRenderBudget/)
  assert.match(platform, /useReducedMotion/)
  assert.match(platform, /useSharedHomeSceneVisualBudget/)
  assert.match(platform, /sharedVisualBudget\?\.budget/)
  assert.match(platform, /data-render-budget-reflection-mode=\{effectiveReflectionMode\}/)
  assert.match(platform, /OrbReflection reflectionMode=\{effectiveReflectionMode\}/)
})

test('Particles and postprocessing consume AAA render budget defaults', async () => {
  const particles = await source('src/spatial/cinematic/CinematicParticles.tsx')
  const post = await source('src/spatial/cinematic/CinematicPostProcessing.tsx')

  assert.match(particles, /resolveSpatialRenderBudget/)
  assert.match(particles, /useReducedMotion/)
  assert.match(particles, /useSharedHomeSceneVisualBudget/)
  assert.match(particles, /sharedVisualBudget\?\.budget/)
  assert.match(particles, /const resolvedBudget = useMemo/)
  assert.match(particles, /data-render-budget-particle-budget=\{particleBudget\}/)
  assert.match(particles, /data-render-budget-atmosphere-mode=\{resolvedBudget\.atmosphereMode\}/)
  assert.doesNotMatch(particles, /budget\?\.particleBudget \?\? \(reducedMotion \? 220 : 940\)/)

  assert.match(post, /resolveSpatialRenderBudget/)
  assert.match(post, /useReducedMotion/)
  assert.match(post, /useSharedHomeSceneVisualBudget/)
  assert.match(post, /sharedVisualBudget\?\.budget/)
  assert.match(post, /const resolvedBudget = useMemo/)
  assert.match(post, /data-render-budget-quality-tier=\{qualityTier\}/)
  assert.match(post, /data-render-budget-bloom-enabled=\{bloomEnabled \? 'true' : 'false'\}/)
  assert.doesNotMatch(post, /budget\?\.qualityTier \?\? \(reducedMotion \? 'low' : 'high'\)/)
})

test('Sky and atmosphere preserve moonlit observatory composition with budget awareness', async () => {
  const sky = await source('src/scene/Sky.tsx')
  const atmosphere = await source('src/scene/Atmosphere.tsx')

  assert.match(sky, /resolveSpatialRenderBudget/)
  assert.match(sky, /useSharedHomeSceneVisualBudget/)
  assert.match(sky, /sharedVisualBudget\?\.budget/)
  assert.match(sky, /data-testid="urai-moonlit-observatory-sky"/)
  assert.match(sky, /data-testid="urai-crescent-moon"/)
  assert.match(sky, /data-testid="urai-horizon-moon-haze"/)
  assert.match(sky, /data-orb-safe-center="true"/)
  assert.match(sky, /data-render-budget-atmosphere-mode=\{resolvedBudget\.atmosphereMode\}/)

  assert.match(atmosphere, /resolveSpatialRenderBudget/)
  assert.match(atmosphere, /useSharedHomeSceneVisualBudget/)
  assert.match(atmosphere, /sharedVisualBudget\?\.budget/)
  assert.match(atmosphere, /fogDensityFor/)
  assert.match(atmosphere, /data-testid="urai-volumetric-look-atmosphere"/)
  assert.match(atmosphere, /data-testid="urai-moonlight-shaft"/)
  assert.match(atmosphere, /data-render-budget-fog-density=\{density\}/)
  assert.match(atmosphere, /scene\.fog = new THREE\.FogExp2\('#071023', density\)/)
})

test('Orb is a layered sacred-tech artifact with stable state API', async () => {
  const orb = await source('src/scene/Orb.tsx')

  assert.match(orb, /export type OrbState = 'idle' \| 'listening' \| 'memoryBloom' \| 'ritual' \| 'recovery'/)
  assert.match(orb, /data-testid="urai-sacred-tech-orb"/)
  assert.match(orb, /data-orb-layered-artifact="true"/)
  assert.match(orb, /data-orb-state=\{activeState\}/)
  assert.match(orb, /data-testid="urai-orb-layered-core"/)
  assert.match(orb, /data-testid="urai-orb-glass-shell"/)
  assert.match(orb, /data-testid="urai-orb-gyroscopic-rings"/)
  assert.match(orb, /data-testid="urai-orb-state-runes"/)
  assert.match(orb, /SacredGlassMaterial/)
  assert.match(orb, /SealedProgressionMaterial/)
  assert.match(orb, /resolveSpatialRenderBudget/)
  assert.match(orb, /ringEnabled = budget\.atmosphereMode !== 'minimal'/)
})

test('HomeScene visual budget utility resolves synchronized render settings', async () => {
  const visualBudget = await source('src/scene/homeSceneVisualBudget.ts')

  assert.match(visualBudget, /export type HomeSceneVisualBudget/)
  assert.match(visualBudget, /resolveHomeSceneVisualBudget/)
  assert.match(visualBudget, /type HomeSceneVisualBudgetInput/)
  assert.match(visualBudget, /sceneMode: HomeSceneMode/)
  assert.match(visualBudget, /qualityTierForMode/)
  assert.match(visualBudget, /if \(reducedMotion\) return 'low'/)
  assert.match(visualBudget, /canvasDpr: \[1, budget\.maxDpr\]/)
  assert.match(visualBudget, /shadowMapSize: budget\.shadowMapSize/)
})

test('Integrated render-budget wrapper remains reusable without owning routes', async () => {
  const wrapper = await source('src/scene/UraiIntegratedHomeScene.tsx')
  const context = await source('src/scene/homeSceneVisualBudgetContext.tsx')

  assert.match(context, /HomeSceneVisualBudgetProvider/)
  assert.match(context, /useSharedHomeSceneVisualBudget/)
  assert.match(wrapper, /HomeSceneVisualBudgetProvider value=\{visualBudget\}/)
  assert.match(wrapper, /resolveHomeSceneVisualBudget/)
  assert.match(wrapper, /dpr=\{visualBudget\.canvasDpr\}/)
  assert.match(wrapper, /shadows=\{visualBudget\.shadowMapSize >= 1536\}/)
  assert.doesNotMatch(wrapper, /TierOneExperience/)
})
