import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { getFocusFrame, rebaseFocusEntryFrame } from '../src/app/focus/focusComposition.ts'

// The visible photosphere has this established world-space center and radius.
// Project its actual surface through Three's view/projection matrices rather
// than repeating the fit formula used by getFocusFrame.
const starCenter = new THREE.Vector3(0, 0.35, -1.55)
const starRadius = 1.15

function projectedBody(frame, viewportAspect, center = starCenter) {
  const camera = new THREE.PerspectiveCamera(frame.fov, viewportAspect, 0.08, 120)
  camera.position.set(...frame.position)
  camera.lookAt(...frame.target)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()

  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity
  const point = new THREE.Vector3()
  for (let latitude = 0; latitude <= 64; latitude += 1) {
    for (let longitude = 0; longitude < 128; longitude += 1) {
      point.setFromSphericalCoords(starRadius, latitude * Math.PI / 64, longitude * Math.PI / 64)
        .add(center)
        .project(camera)
      assert.ok([point.x, point.y, point.z].every(Number.isFinite), 'sphere projection must be finite')
      assert.ok(point.z > -1 && point.z < 1, 'the complete body must remain between the clipping planes')
      const x = (point.x + 1) / 2
      const y = (1 - point.y) / 2
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  return { left, right, top, bottom, width: right - left, height: bottom - top, centerX: (left + right) / 2, centerY: (top + bottom) / 2 }
}

function inRange(value, lower, upper, description) {
  assert.ok(value >= lower && value <= upper, `${description}: expected ${lower}–${upper}, got ${value}`)
}

function completeBody(body) {
  inRange(body.left, 0, 1, 'left limb inside viewport')
  inRange(body.right, 0, 1, 'right limb inside viewport')
  inRange(body.top, 0, 1, 'upper limb inside viewport')
  inRange(body.bottom, 0, 1, 'lower limb inside viewport')
}

test('desktop 1440×900 keeps an intimate complete stellar disk clear of the heading', () => {
  const body = projectedBody(getFocusFrame(1440 / 900), 1440 / 900)
  completeBody(body)
  inRange(body.height, 0.38, 0.46, 'desktop body height')
  inRange(body.centerX, 0.51, 0.59, 'desktop body horizontal center')
  inRange(body.centerY, 0.42, 0.52, 'desktop body vertical center')
})

for (const [width, height] of [[390, 844], [320, 700]]) {
  test(`portrait ${width}×${height} keeps the complete disk above context and controls`, () => {
    const aspect = width / height
    const body = projectedBody(getFocusFrame(aspect), aspect)
    completeBody(body)
    inRange(body.height, 0.27, 0.36, 'portrait body height')
    inRange(body.width, 0.58, 0.82, 'portrait body width')
    inRange(body.centerX, 0.47, 0.53, 'portrait body horizontal center')
    inRange(body.centerY, 0.35, 0.44, 'portrait body vertical center')
    assert.ok(body.bottom < 0.59, 'portrait body must finish above the context region')
  })
}

test('short landscape 844×390 frames the disk below the dock and beside the context', () => {
  const aspect = 844 / 390
  const body = projectedBody(getFocusFrame(aspect), aspect)
  completeBody(body)
  inRange(body.height, 0.28, 0.40, 'short landscape body height')
  inRange(body.centerX, 0.52, 0.64, 'short landscape body horizontal center')
  inRange(body.centerY, 0.51, 0.67, 'short landscape body vertical center')
  assert.ok(body.left > 0.46, 'short landscape body must stay beside the left context region')
  assert.ok(body.top > 0.35, 'short landscape body must start below the top dock region')
})

test('invalid viewport aspects yield a finite usable fallback frame', () => {
  for (const aspect of [NaN, Infinity, -Infinity, 0, -1]) {
    const frame = getFocusFrame(aspect)
    assert.ok([...frame.position, ...frame.target, frame.fov].every(Number.isFinite), `finite fallback for ${aspect}`)
    completeBody(projectedBody(frame, 16 / 9))
  }
})

test('translated Life Map arrivals retain camera direction, distance and actual framing in Focus', () => {
  const arrivals = [
    { target: [-12.2, 2.6, -14.1], offset: [0.3, 0.6, 6], fov: 44, aspect: 1440 / 900 },
    { target: [18, -4.2, -10], offset: [1.2, 1.4, 8.1], fov: 57, aspect: 390 / 844 },
    { target: [121, -3, 220], offset: [-1.3, 0.4, 5.8], fov: 46, aspect: 844 / 390 },
  ]
  for (const arrival of arrivals) {
    const sourceTarget = new THREE.Vector3(...arrival.target)
    const sourcePosition = sourceTarget.clone().add(new THREE.Vector3(...arrival.offset))
    const source = { position: sourcePosition.toArray(), target: sourceTarget.toArray(), fov: arrival.fov }
    const original = structuredClone(source)
    const rebased = rebaseFocusEntryFrame(source)
    assert.ok(rebased, 'valid translated arrival must be accepted')
    assert.deepEqual(rebased.target, starCenter.toArray(), 'arrival must target the actual Focus photosphere')
    assert.equal(rebased.fov, source.fov, 'an in-range arrival FOV must be retained')
    assert.deepEqual(source, original, 'rebasing must not mutate the source arrival')

    const sourceOffset = sourcePosition.clone().sub(sourceTarget)
    const rebasedOffset = new THREE.Vector3(...rebased.position).sub(new THREE.Vector3(...rebased.target))
    assert.ok(sourceOffset.distanceTo(rebasedOffset) < 1e-10, 'relative camera-target offset must be retained')
    assert.ok(Math.abs(sourceOffset.length() - rebasedOffset.length()) < 1e-10, 'arrival standoff distance must be retained')
    assert.ok(sourceOffset.clone().normalize().dot(rebasedOffset.clone().normalize()) > 1 - 1e-12, 'arrival view direction must be retained')

    const sourceBody = projectedBody(source, arrival.aspect, sourceTarget)
    const focusBody = projectedBody(rebased, arrival.aspect)
    completeBody(focusBody)
    for (const key of Object.keys(sourceBody)) {
      assert.ok(Math.abs(sourceBody[key] - focusBody[key]) < 1e-10, `${key} projection must be unchanged by coordinate translation`)
    }
  }
})

test('arrival rebasing rejects invalid offsets and safely bounds finite FOV values', () => {
  assert.equal(rebaseFocusEntryFrame(null), null)
  assert.equal(rebaseFocusEntryFrame({ position: [4, 5, 6], target: [4, 5, 6], fov: 46 }), null)
  assert.equal(rebaseFocusEntryFrame({ position: [0, 0, Infinity], target: [0, 0, 0], fov: 46 }), null)
  assert.equal(rebaseFocusEntryFrame({ position: [0, 0, 6], target: [0, NaN, 0], fov: 46 }), null)
  assert.equal(rebaseFocusEntryFrame({ position: [0, 0, 6], target: [0, 0, 0], fov: NaN }), null)
  assert.equal(rebaseFocusEntryFrame({ position: [0, 0, 6], target: [0, 0], fov: 46 }), null)
  assert.equal(rebaseFocusEntryFrame({ position: [Number.MAX_VALUE, 0, 6], target: [-Number.MAX_VALUE, 0, 0], fov: 46 }), null)
  for (const [fov, expected] of [[20, 36], [44, 44], [100, 68]]) {
    const frame = rebaseFocusEntryFrame({ position: [12, 3, -1], target: [12, 3, -7], fov })
    assert.ok(frame)
    assert.equal(frame.fov, expected)
    assert.deepEqual(frame.position, [0, 0.35, 4.45])
    assert.deepEqual(frame.target, [0, 0.35, -1.55])
  }
})
