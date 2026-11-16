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

test('Replay atmosphere uses a feathered horizon glow rather than a hard circle', async () => {
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('name="replay-memory-horizon-glow"')
  assert.ok(start !== -1, 'known horizon glow must remain discoverable')
  const end = source.indexOf('</mesh>', start)
  const haze = source.slice(start, end)
  assert.match(haze, /planeGeometry args=\{\[9\.2, 9\.2\]\}/)
  assert.match(haze, /shaderMaterial/)
  assert.match(haze, /vertexShader=\{REPLAY_HORIZON_VERTEX_SHADER\}/)
  assert.match(haze, /smoothstep\(0\.05, 1\.0, radius\)/)
  assert.match(haze, /depthWrite=\{false\}/)
  assert.doesNotMatch(haze, /circleGeometry/)
  assert.match(source, /html\[data-urai-preview="true"\] \.replayWorld header\{top:max\(78px/)
})


test('Replay horizon halo retains an actual transformed WebGL gradient without a projection screen', async () => {
  const { REPLAY_HORIZON_VERTEX_SHADER } = await import('../src/app/replay/replayHorizonVertexShader.ts')
  assert.match(REPLAY_HORIZON_VERTEX_SHADER, /gl_Position\s*=\s*projectionMatrix\s*\*\s*modelViewMatrix/)
  assert.match(REPLAY_HORIZON_VERTEX_SHADER, /vGlowUv\s*=\s*uv/)
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /projector|movie screen|projection/i)
})

test('Replay backdrop uses terrain-conforming ridges without giant ellipsoid silhouettes', async () => {
  const { buildReplayDistantRidgeGeometry, replayRidgeElevation } = await import('../src/app/replay/replayDistantRidgeGeometry.ts')
  const height = (x, z) => -1.72 + Math.sin(x * .37 + z * .075) * .28
  for (const section of ['left', 'right', 'horizon']) {
    const geometry = buildReplayDistantRidgeGeometry(section, height)
    const positions = geometry.getAttribute('position')
    assert.ok(positions.count > 1000)
    assert.equal(geometry.userData.truthClass, 'disclosed-demonstration')
    assert.equal(geometry.userData.finalArtAdmitted, false)
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index)
      assert.ok([x, y, z].every(Number.isFinite))
      assert.ok(Math.abs(y - replayRidgeElevation(section, x, z, height)) < 0.0001)
    }
    geometry.dispose()
  }
  assert.ok(Math.abs(replayRidgeElevation('left', -10, -17, height) - height(-10, -17)) < .06)
  assert.ok(Math.abs(replayRidgeElevation('right', 10, -17, height) - height(10, -17)) < .06)
  assert.throws(() => buildReplayDistantRidgeGeometry('left', () => NaN), /finite terrain elevation/)
  const { readFileSync } = await import('node:fs')
  const client = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
  assert.match(client, /buildReplayDistantRidgeGeometry\('left'/)
  for (const section of ['left', 'right', 'horizon']) {
    const start = client.indexOf('name="replay-memory-ridge-' + section + '"')
    assert.ok(start > 0)
    assert.doesNotMatch(client.slice(start, client.indexOf('</mesh>', start)), /icosahedronGeometry/)
  }
})

test('Replay timeline retains a visible pointer and touch seek surface with keyboard focus', async () => {
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
  assert.match(source, /<input className="memorySeek" type="range"/)
  assert.match(source, /onChange=\{\(event\) => seek\(Number\(event\.currentTarget\.value\)\)\}/)
  assert.match(source, /\.memorySeek\{position:absolute;inset:0;z-index:2;width:100%;height:48px/)
  assert.match(source, /touch-action:none/)
  assert.match(source, /\.memorySeek:focus-visible\{outline:3px solid #fff/)
  assert.doesNotMatch(source, /\.memorySeek\{[^}]*pointer-events:none/)
})
