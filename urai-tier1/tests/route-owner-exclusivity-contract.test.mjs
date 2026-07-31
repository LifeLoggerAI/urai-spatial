import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const autonomous = read('src/app/UraiAutonomousV1Layer.tsx')
const layout = read('src/app/layout.tsx')
const homeOwner = read('src/app/FinalHomeThreshold.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')
const ownerCss = read('src/spatial/world/routeOwnerConvergence.css')

test('Focus and Replay are never mounted by the legacy autonomous layer', () => {
  assert.doesNotMatch(autonomous, /function\s+FocusWorld/)
  assert.doesNotMatch(autonomous, /function\s+ReplayWorld/)
  assert.doesNotMatch(autonomous, /startsWith\(["']\/focus/)
  assert.doesNotMatch(autonomous, /startsWith\(["']\/replay/)
  assert.doesNotMatch(autonomous, /quiet-reset|The Quiet Reset|WHY THIS STAR IS AWAKE/)
})

test('duplicate-owner visual recovery and suppression rules stay retired', () => {
  assert.doesNotMatch(layout, /focus-replay-visual-recovery\.css/)
  assert.doesNotMatch(ownerCss, /uraiAutoFocus|uraiAutoReplay/)
})

test('Home transfers settled ownership to the runtime boundary after capability resolution', () => {
  assert.match(homeOwner, /useWebGLAvailable/)
  assert.match(homeOwner, /mounted && webglAvailable !== null\) return null/)
  assert.match(homeOwner, /data-testid="urai-home-accessible-fallback"/)
  assert.match(homeOwner, /data-webgl-state=\{!mounted \|\| webglAvailable === null \? 'detecting' : 'unavailable'\}/)
  assert.match(homeOwner, /<HomeSpatialWorldFinal \/>/)

  assert.match(homeRuntime, /webglAvailable === false/)
  assert.match(homeRuntime, /data-testid="urai-home-accessible-fallback"/)
  assert.match(homeRuntime, /role="region"/)
  assert.match(homeRuntime, /aria-label="Spatial Home fallback"/)
  assert.match(homeRuntime, /data-home-navigation-owner="runtime-boundary"/)
})

test('WebGL Home contains neither tutorial chrome nor a second DOM Orb control', () => {
  assert.doesNotMatch(homeCanvas, /Drag to look|tap the ground to enter below/)
  assert.doesNotMatch(homeCanvas, /urai-home-spatial-portal-label/)
  assert.doesNotMatch(homeCanvas, /<Html/)
})
