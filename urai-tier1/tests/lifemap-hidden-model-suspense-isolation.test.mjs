import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Original source contract: visible 3D galaxy must never be suspended by a
// hidden authored GLB. Not a substitute for real rendered-pixel acceptance.
const source = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const scene = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const modelStart = source.indexOf('function AuthoredMemoryStarModel(')
const starStart = source.indexOf('function AuthoredMemoryStar(')
const coreStart = source.indexOf('function LifeCore(')
const authoredModel = source.slice(modelStart, starStart)
const visibleStar = source.slice(starStart, coreStart)

test('hidden authored asset loads inside its own nested Suspense boundary', () => {
  assert.ok(modelStart > 0 && starStart > modelStart && coreStart > starStart)
  assert.match(source, /import \{ Suspense,/)
  assert.match(authoredModel, /useGLTF\(MEMORY_STAR_MODEL\)/)
  assert.match(authoredModel, /prepareAuthoredModel\(scene, aura\)/)
  assert.match(authoredModel, /useAnimations\(animations, root\)/)
  assert.match(authoredModel, /chosen\.reset\(\)\.play\(\)/)
  assert.match(authoredModel, /<primitive object=\{model\} visible=\{false\}/)
  assert.doesNotMatch(visibleStar, /useGLTF\(|useAnimations\(/)
  assert.match(visibleStar, /<Suspense fallback=\{null\}>\s*<AuthoredMemoryStarModel aura=\{aura\} active=\{active\} clip=\{clip\}/)
})

test('real stellar photosphere, corona, shaders and 3D lighting never wait for hidden model', () => {
  assert.match(visibleStar, /<StellarCorona/)
  assert.match(visibleStar, /name="memory-star-photosphere"/)
  assert.match(visibleStar, /new THREE\.ShaderMaterial\(/)
  assert.match(visibleStar, /photosphere\.uniforms\.uTime\.value/)
  assert.match(visibleStar, /<pointLight color=\{aura\}/)
  assert.match(source, /<GalaxyDepth tier=\{profile\.tier\}/)
  assert.match(source, /<RenderProofRepublisher \/>/)
  assert.match(source, /<LifeCore hidden=\{Boolean\(selected\)\}/)
  assert.match(scene, /<LifeMapProductionWorld/)
})

test('the original world still requires rendered scene proof rather than asset-loader status', () => {
  assert.match(scene, /data-testid="urai-true-3d-life-map"/)
  assert.match(scene, /data-life-map-source=\{sourceMode\}/)
  assert.match(source, /element\.dataset\.lifeMapRenderReady = ready \? "true" : "false"/)
  assert.match(source, /gl\.info\.render\.calls/)
  assert.match(source, /anchors >= 8/)
})
