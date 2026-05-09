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

const model = read('src/spatial/world/uraiSpatialWorldModel.ts')
const tierOne = read('src/spatial/layout/TierOneExperience.tsx')
const homeScene = read('src/scene/HomeScene.tsx')
const integrationContract = read('src/lib/spatial-system-contract.ts')

test('URAI Spatial exposes the required 3D world modes and world state', () => {
  for (const token of [
    "'home'",
    "'ascent'",
    "'lifeMap'",
    "'focus'",
    "'replay'",
    "'mirror'",
    "'unwinding'",
    'type UraiSpatialWorldState',
    'navigationStack',
    'fallbackMode',
    'webglAvailable',
  ]) {
    assert.match(model, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
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

test('TierOneExperience declares the real 3D world layer and camera attributes around the R3F scene', () => {
  assert.match(tierOne, /data-testid="urai-spatial-world-root"/)
  assert.match(tierOne, /data-urai-world-layer="3d"/)
  assert.match(tierOne, /data-urai-dom-role="accessible-control-overlay"/)
  assert.match(tierOne, /data-urai-world-mode=\{worldMode\}/)
  assert.match(tierOne, /data-urai-camera-position=\{cameraPreset\.position\.join/)
  assert.match(tierOne, /data-urai-camera-target=\{cameraPreset\.target\.join/)
  assert.match(tierOne, /data-urai-camera-fov=\{cameraPreset\.fov\}/)
})

test('HomeScene remains the real React Three Fiber world renderer', () => {
  assert.match(homeScene, /import \{ Canvas \} from '@react-three\/fiber'/)
  assert.match(homeScene, /<Canvas shadows/)
  assert.match(homeScene, /<PerspectiveCamera makeDefault/)
  assert.match(homeScene, /<CinematicCameraRig/)
  assert.match(homeScene, /<Sky \/>/)
  assert.match(homeScene, /<Atmosphere \/>/)
  assert.match(homeScene, /<ConstellationLayer/)
  assert.match(homeScene, /<CinematicParticles/)
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
