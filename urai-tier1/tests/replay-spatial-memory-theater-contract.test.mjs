import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync('src/app/replay/CinematicReplayClient.tsx', 'utf8')

test('Replay owns a real immersive R3F memory field instead of a theater or CSS-only composition', () => {
  assert.match(source, /import \{ Canvas, useFrame \} from '@react-three\/fiber'/)
  assert.match(source, /data-replay-spatial-owner="r3f-immersive-memory-field"/)
  assert.match(source, /<ReplaySpatialScene memory=\{memory\}/)
  assert.match(source, /function MemoryMediaDome/)
  assert.match(source, /name="replay-immersive-memory-field"/)
  assert.match(source, /inside-memory-environment-not-screen/)
  assert.match(source, /<sphereGeometry args=\{\[24, 96, 64\]\}/)
  assert.match(source, /side=\{THREE\.BackSide\}/)
  assert.doesNotMatch(source, /replay-memory-environment-v1\.glb|REPLAY_ENVIRONMENT_MODEL|r3f-memory-theater|replay-film-portal|MemoryMediaSurface|REPLAY_SCREEN_POSITION|planeGeometry/)
})

test('Replay maps source media into the inside-facing memory environment and preserves video play state', () => {
  assert.match(source, /new THREE\.VideoTexture\(video\)/)
  assert.match(source, /new THREE\.TextureLoader\(\)/)
  assert.match(source, /map=\{texture\}/)
  assert.match(source, /video\.playsInline = true/)
  assert.match(source, /video\.muted = true/)
  assert.match(source, /if \(playing\) void video\.play\(\)\.catch/)
  assert.match(source, /else video\.pause\(\)/)
})

test('Replay retains temporal reconstruction controls without turning the scene back into a media screen', () => {
  assert.match(source, /ReplayTimelineField/)
  assert.match(source, /ReplayCameraRig/)
  assert.match(source, /aria-label=\{playing \? 'Pause replay' : 'Play replay'\}/)
  assert.match(source, /type="range"/)
  assert.doesNotMatch(source, /<video|<img|<iframe/)
})
