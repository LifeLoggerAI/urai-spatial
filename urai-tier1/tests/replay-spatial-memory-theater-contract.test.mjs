import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync('src/app/replay/CinematicReplayClient.tsx', 'utf8')
const model = 'public/assets/urai/generated/models/replay-memory-environment-v1.glb'

test('Replay owns a real R3F memory theater instead of a CSS-only composition', () => {
  assert.match(source, /import \{ Canvas, useFrame \} from '@react-three\/fiber'/)
  assert.match(source, /REPLAY_ENVIRONMENT_MODEL = '\/assets\/urai\/generated\/models\/replay-memory-environment-v1\.glb'/)
  assert.match(source, /data-replay-spatial-owner="r3f-memory-theater"/)
  assert.match(source, /<ReplaySpatialScene memory=\{memory\}/)
  assert.match(source, /<primitive object=\{model\} name="replay-memory-environment-v1"/)
  assert.ok(fs.existsSync(model), 'committed Replay environment GLB must exist')
  assert.ok(fs.statSync(model).size > 100_000, 'Replay environment must be a real binary asset')
})

test('Replay projects source media into the in-world screen and preserves video play state', () => {
  assert.match(source, /function MemoryMediaSurface/)
  assert.match(source, /new THREE\.VideoTexture\(video\)/)
  assert.match(source, /new THREE\.TextureLoader\(\)/)
  assert.match(source, /REPLAY_SCREEN_POSITION/)
  assert.match(source, /if \(playing\) void video\.play\(\)\.catch/)
  assert.match(source, /else video\.pause\(\)/)
})

test('Replay camera and timeline are semantic functions of replay progress', () => {
  assert.match(source, /function ReplayCameraRig/)
  assert.match(source, /progress - 0\.5/)
  assert.match(source, /function ReplayTimelineField/)
  assert.match(source, /memory\.replayManifest\.segments\.map/)
  assert.match(source, /userData=\{\{ replaySegment: segment\.id \}\}/)
})

test('Replay keeps accessible product controls above the spatial scene', () => {
  assert.match(source, /<section className="controls" aria-label="Replay controls">/)
  assert.match(source, /<ReplayProductControls memory=\{memory\} \/>/)
  assert.match(source, /<details className="transcript">/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /closest\('button, input, textarea, select, summary, a, \[role="button"\]'\)/)
})
