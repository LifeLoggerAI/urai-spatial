import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReplayWornTrailGeometry, replayTrailCenter, REPLAY_TRAIL_ROWS, REPLAY_TRAIL_LANES, REPLAY_TRAIL_END_Z } from '../src/app/replay/replayTrailGeometry.ts'

test('terrain-conforming Replay demo trail stays above real terrain without floating slabs', () => {
  const height = (x, z) => Math.sin(x * .37 + z * .075) * .28 - 1.72
  const geo = buildReplayWornTrailGeometry(height)
  const pos = geo.getAttribute('position'), color = geo.getAttribute('color')
  const uv = geo.getAttribute('uv'), normal = geo.getAttribute('normal')
  assert.equal(pos.count, (REPLAY_TRAIL_ROWS + 1) * (REPLAY_TRAIL_LANES + 1))
  assert.equal(color.count, pos.count)
  assert.equal(uv.count, pos.count)
  assert.equal(geo.getIndex().count, REPLAY_TRAIL_ROWS * REPLAY_TRAIL_LANES * 6)
  assert.equal(geo.userData.truthClass, 'disclosed-demonstration')
  assert.equal(geo.userData.finalArtAdmitted, false)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    assert.ok([x, y, z].every(Number.isFinite))
    assert.ok(y > height(x, z) + .02 && y < height(x, z) + .05)
    assert.ok(normal.getY(i) > 0.1)
  }
  assert.ok(Math.abs(replayTrailCenter(-5) - replayTrailCenter(-19)) > .08)
  geo.dispose()
})

test('Replay physical trail produces deterministic geometry and surface colors', () => {
  const a = buildReplayWornTrailGeometry(() => -1.5)
  const b = buildReplayWornTrailGeometry(() => -1.5)
  assert.deepEqual(Array.from(a.getAttribute('position').array), Array.from(b.getAttribute('position').array))
  assert.deepEqual(Array.from(a.getAttribute('color').array), Array.from(b.getAttribute('color').array))
  a.dispose(); b.dispose()
})

test('Replay trail rejects nonfinite ground elevations before creating a mesh', () => {
  assert.throws(() => buildReplayWornTrailGeometry(() => NaN), /finite terrain height/)
})

test('the entire visible Replay trail remains on the actual terrain mesh footprint', () => {
  // Actual Replay ground is 52m across z, offset by -7m: [-33, 19].
  assert.ok(REPLAY_TRAIL_END_Z >= -33, 'the far trail end may not leave the rendered ground mesh')
  const geometry = buildReplayWornTrailGeometry(() => -1.6)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    assert.ok(positions.getZ(i) >= -33 && positions.getZ(i) <= 19, 'every trail vertex must be on the visible mesh')
    assert.ok(Math.abs(positions.getX(i)) <= 19, 'trail may not leave the terrain width')
  }
  geometry.dispose()
})
