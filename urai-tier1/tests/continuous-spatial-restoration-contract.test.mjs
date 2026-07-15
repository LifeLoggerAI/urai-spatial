import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

const template = read('src/app/template.tsx')
const layer = read('src/app/HomeSpatialRuntimeLayer.tsx')
const canvas = read('src/app/HomeSpatialCanvas.tsx')
const css = read('src/app/spatial-runtime-restoration.css')
const homeOwner = read('src/app/FinalHomeThreshold.tsx')
const groundOwner = read('src/app/ground/page.tsx')
const lifeMapOwner = read('src/app/life-map/page.tsx')

test('app template mounts the restored Home WebGL runtime without replacing route owners', () => {
  assert.match(template, /HomeSpatialRuntimeLayer/)
  assert.match(template, /spatial-runtime-restoration\.css/)
  assert.match(layer, /pathname !== '\/' && pathname !== '\/home'/)
  assert.match(layer, /data-urai-home-runtime="one-continuous-webgl-world"/)
  assert.match(homeOwner, /HomeSpatialWorldFinal/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
})

test('restored Home is an interactive world with grounded routes and fallback behavior', () => {
  for (const marker of [
    "id: 'ground'",
    "id: 'life-map'",
    "id: 'mirror'",
    "id: 'passport'",
    "id: 'xr'",
    'OrbitControls',
    'Stars',
    'Bloom',
    'useWebGLAvailable',
    'data-home-spatial-renderer="webgl"',
  ]) assert.ok(canvas.includes(marker), `missing Home spatial marker: ${marker}`)
})

test('flat route-image veils are suppressed while current Ground and Life Map canvases remain authoritative', () => {
  assert.match(css, /\.ground-provider-art\s*\{\s*display: none !important;/s)
  assert.match(css, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(css, /data-testid="urai-true-3d-life-map"/)
  assert.match(css, /\.urai-cinematic-backdrop/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('restoration does not redirect Focus or Replay away from their certified static owners', () => {
  assert.doesNotMatch(template, /focus|replay/i)
  assert.doesNotMatch(layer, /pathname === '\/focus'|pathname === '\/replay'/)
})
