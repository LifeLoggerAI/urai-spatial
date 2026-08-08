import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const model = read('src/spatial/world/uraiSpatialWorldModel.ts')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')
const lifeMap = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const integrationContract = read('src/lib/spatial-system-contract.ts')

test('URAI Spatial exposes the required 3D world modes and world state', () => {
  for (const token of ["'home'", "'ascent'", "'lifeMap'", "'focus'", "'replay'", "'mirror'", "'unwinding'", 'type UraiSpatialWorldState', 'navigationStack', 'fallbackMode', 'webglAvailable']) {
    assert.ok(model.includes(token), `world model missing ${token}`)
  }
})

test('URAI Spatial camera presets cover all locked route states', () => {
  assert.match(model, /export const URAI_CAMERA_PRESETS/)
  for (const mode of ['home', 'ascent', 'lifeMap', 'focus', 'replay', 'mirror', 'unwinding']) {
    assert.match(model, new RegExp(`${mode}: \\{[\\s\\S]*?position: \\[`, 'm'))
    assert.match(model, new RegExp(`${mode}: \\{[\\s\\S]*?target: \\[`, 'm'))
    assert.match(model, new RegExp(`${mode}: \\{[\\s\\S]*?fov:`, 'm'))
  }
})

test('Life Map star and replay data use true x/y/z world positions', () => {
  assert.match(model, /position: \{\s*x: number;\s*y: number;\s*z: number;\s*\}/)
  assert.match(model, /URAI_SPATIAL_STARS_3D/)
  assert.match(model, /URAI_SPATIAL_CONSTELLATION_PATHS_3D/)
  assert.match(model, /kind: 'replay'/)
  assert.match(model, /starsHave3DPositions/)
  assert.match(model, /pathsUse3DPositions/)
  assert.match(model, /replayPathExists/)
})

test('canonical Home runtime owns real WebGL only on Home paths', () => {
  assert.match(homeRuntime, /normalizedPathname === '\/' \|\| normalizedPathname === '\/home'/)
  assert.match(homeRuntime, /AssetDrivenHomeWorld/)
  assert.match(homeRuntime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.match(homeCanvas, /Canvas/)
  assert.doesNotMatch(homeRuntime, /TierOneExperience|UraiSpatialStage/)
})

test('canonical Life Map remains a true React Three Fiber 3D world', () => {
  assert.match(lifeMap, /import \{ Canvas/)
  assert.match(lifeMap, /<Canvas/)
  assert.match(lifeMap, /data-testid="urai-true-3d-life-map"/)
  assert.match(lifeMap, /THREE\.Vector3/)
  assert.match(lifeMap, /goalForNode/)
})

test('system integration contract exposes the 3D world proof', () => {
  assert.match(integrationContract, /assertUraiSpatial3DWorldModel/)
  assert.match(integrationContract, /world3D/)
  assert.match(integrationContract, /"3d-world-layer"/)
  assert.match(integrationContract, /"3d-camera-presets"/)
  assert.match(integrationContract, /"3d-star-depth-model"/)
  assert.match(integrationContract, /"3d-replay-path-model"/)
  assert.match(integrationContract, /"\/api\/system\/urai-spatial-3d-world"/)
})
