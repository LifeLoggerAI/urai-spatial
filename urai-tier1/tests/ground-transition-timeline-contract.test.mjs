import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GROUND_DESCENT_TOTAL_MS,
  GROUND_REDUCED_MOTION_TOTAL_MS,
  GROUND_RETURN_TOTAL_MS,
  GROUND_REDUCED_RETURN_TOTAL_MS,
  GROUND_DESCENT_WINDOWS,
  GROUND_REDUCED_DESCENT_WINDOWS,
  GROUND_RETURN_WINDOWS,
  GROUND_REDUCED_RETURN_WINDOWS,
  groundDescentPhaseAt,
  groundReturnPhaseAt,
  groundTransitionProgress,
  groundReturnProgress,
} from '../src/spatial/ground/groundTransitionTimeline.ts'

function assertContiguous(windows, total) {
  assert.equal(windows[0].startMs, 0)
  for (let index = 1; index < windows.length; index += 1) {
    assert.equal(windows[index - 1].endMs, windows[index].startMs)
    assert.ok(windows[index].endMs > windows[index].startMs)
  }
  assert.equal(windows.at(-1).endMs, total)
}

test('normal Ground descent owns the locked 2.65 second semantic sequence', () => {
  assert.equal(GROUND_DESCENT_TOTAL_MS, 2650)
  assertContiguous(GROUND_DESCENT_WINDOWS, GROUND_DESCENT_TOTAL_MS)
  assert.equal(groundDescentPhaseAt(0), 'ground-recognition')
  assert.equal(groundDescentPhaseAt(180), 'home-avatar-camera-approach')
  assert.equal(groundDescentPhaseAt(550), 'home-avatar-eye-transfer')
  assert.equal(groundDescentPhaseAt(720), 'ground-surface-approach')
  assert.equal(groundDescentPhaseAt(1100), 'ground-surface-crossing')
  assert.equal(groundDescentPhaseAt(1560), 'ground-spatial-fold')
  assert.equal(groundDescentPhaseAt(2100), 'ground-world-reveal')
  assert.equal(groundDescentPhaseAt(2420), 'ground-arrival-handoff')
  assert.equal(groundDescentPhaseAt(2650), 'ground-first-person')
  assert.equal(groundTransitionProgress(1325), 0.5)
})

test('reduced motion preserves semantic order inside the locked 450-600ms window', () => {
  assert.equal(GROUND_REDUCED_MOTION_TOTAL_MS, 520)
  assertContiguous(GROUND_REDUCED_DESCENT_WINDOWS, GROUND_REDUCED_MOTION_TOTAL_MS)
  assert.equal(groundDescentPhaseAt(0, true), 'ground-recognition')
  assert.equal(groundDescentPhaseAt(140, true), 'home-avatar-eye-transfer')
  assert.equal(groundDescentPhaseAt(300, true), 'ground-surface-crossing')
  assert.equal(groundDescentPhaseAt(390, true), 'ground-spatial-fold')
  assert.equal(groundDescentPhaseAt(500, true), 'ground-arrival-handoff')
  assert.equal(groundDescentPhaseAt(520, true), 'ground-first-person')
  assert.equal(groundTransitionProgress(260, true), 0.5)
})

test('Ground return has explicit reverse material and Avatar-eye states', () => {
  assert.equal(GROUND_RETURN_TOTAL_MS, 2650)
  assert.equal(GROUND_REDUCED_RETURN_TOTAL_MS, 520)
  assertContiguous(GROUND_RETURN_WINDOWS, GROUND_RETURN_TOTAL_MS)
  assertContiguous(GROUND_REDUCED_RETURN_WINDOWS, GROUND_REDUCED_RETURN_TOTAL_MS)
  assert.equal(groundReturnPhaseAt(0), 'ground-return-commit')
  assert.equal(groundReturnPhaseAt(200), 'ground-return-compression')
  assert.equal(groundReturnPhaseAt(900), 'ground-return-geology')
  assert.equal(groundReturnPhaseAt(1500), 'ground-return-surface-crossing')
  assert.equal(groundReturnPhaseAt(2000), 'home-avatar-eye-return')
  assert.equal(groundReturnPhaseAt(2400), 'home-avatar-camera-withdraw')
  assert.equal(groundReturnPhaseAt(2650), 'home-idle-restored')
  assert.equal(groundReturnProgress(260, true), 0.5)
})

test('transition progress clamps instead of leaking invalid camera progress', () => {
  assert.equal(groundTransitionProgress(-20), 0)
  assert.equal(groundTransitionProgress(9000), 1)
  assert.equal(groundReturnProgress(-20), 0)
  assert.equal(groundReturnProgress(9000), 1)
})
