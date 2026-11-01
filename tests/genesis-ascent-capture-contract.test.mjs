import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = (p) => readFileSync(resolve(root, p), 'utf8')

test('private sampler uses exactly the mounted Home Ascent camera source contract', () => {
  const mounted = source('urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx')
  const sampler = source('scripts/genesis-ascent-camera-sampler.mjs')
  const capture = source('scripts/genesis-ascent-patched-review-capture.mjs')
  for (const key of ['homeAscentR3fCallbacks','homeAscentCameraX','homeAscentCameraY','homeAscentCameraZ']) {
    assert.ok(mounted.includes(key), 'camera field absent from original R3F rig: ' + key)
    assert.ok(sampler.includes(key), 'sampler fails to read mounted camera field: ' + key)
  }
  for (const key of ['sampleHomeAscentFlight(', 'homeAscentR3fCallbacks', 'homeAscentRendererFrame']) {
    assert.ok(mounted.includes(key))
    assert.ok(capture.includes(key))
  }
  assert.doesNotMatch(sampler, /homeAscentCameraTicks|homeAscentCameraPosition/)
})

test('review-only pipeline cannot call a field counter a rendered video acceptance', () => {
  const capture = source('scripts/genesis-ascent-patched-review-capture.mjs')
  const inspector = source('scripts/genesis-ascent-pixel-gate.py')
  assert.match(capture, /genesis-ascent-pixel-gate\\.py/)
  assert.match(capture, /PIXEL_AND_CAMERA_PREFLIGHT_PASSED_HUMAN_REVIEW_REQUIRED/)
  assert.ok(capture.indexOf('receipt.pixelPreflight=') < capture.indexOf('receipt.completed=true'))
  assert.match(inspector, /NO_GEOMETRIC_SCENERY_MOTION_PROVEN/)
  assert.match(inspector, /CONTINUOUS_UPWARD_CAMERA_PATH_NOT_PROVEN/)
  assert.match(inspector, /independentHumanApproval': False/)
})
