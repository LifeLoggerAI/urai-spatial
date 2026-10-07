import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { URAI_SOURCE_MESSAGES } from '../src/lib/i18n/locales.ts'

const source = fs.readFileSync('src/app/replay/CinematicReplayClient.tsx', 'utf8')
const recordedSource = fs.readFileSync('src/app/replay/ReplayRecordedSource.tsx', 'utf8')
const mediaSession = fs.readFileSync('src/app/replay/replayMediaSession.ts', 'utf8')

test('Replay owns a real immersive R3F memory field instead of a theater or CSS-only composition', () => {
  assert.match(source, /import \{ Canvas, useFrame \} from '@react-three\/fiber'/)
  assert.match(source, /demoEnvironment && webgl\.state === 'ready' \? 'r3f-immersive-memory-field'/)
  assert.match(source, /<ReplaySpatialScene memory=\{memory\}/)
  assert.match(source, /function MemoryMediaDome/)
  assert.match(source, /name="replay-immersive-memory-field"/)
  assert.match(source, /inside-memory-environment-not-screen/)
  assert.match(source, /<sphereGeometry args=\{\[24, 96, 64\]\}/)
  assert.match(source, /side=\{THREE\.BackSide\}/)
  assert.doesNotMatch(source, /replay-memory-environment-v1\.glb|REPLAY_ENVIRONMENT_MODEL|r3f-memory-theater|replay-film-portal|MemoryMediaSurface|REPLAY_SCREEN_POSITION/)
  // The disclosed landscape legitimately has horizontal water. A world surface
  // is not a projection screen: every flat JSX plane must be named terrain/water
  // and rotated into the horizontal world, rather than accepting arbitrary planes.
  const worldPlanes = [...source.matchAll(/<mesh\b([^>]*?)>\s*<planeGeometry\b/g)]
  assert.equal(worldPlanes.length, (source.match(/<planeGeometry\b/g) || []).length)
  for (const [, attributes] of worldPlanes) {
    assert.match(attributes, /name="replay-memory-(?:water|ground)"/)
    assert.match(attributes, /rotation=\{\[-Math\.PI\s*\/\s*2,/)
  }
})

test('Replay admits the demo dome separately and preserves original recorded-source framing and real video transport', () => {
  assert.match(source, /new THREE\.TextureLoader\(\)/)
  assert.match(source, /map=\{texture\}/)
  assert.match(source, /memory\.demo \? <MemoryMediaDome/)
  assert.match(recordedSource, /recorded-source-original-framing/)
  assert.match(source, /object-fit:contain/)
  assert.match(mediaSession, /video\.playsInline = true/)
  assert.match(mediaSession, /video\.muted = true/)
  assert.match(mediaSession, /await video\.play\(\)/)
  assert.match(mediaSession, /listen\('timeupdate'/)
  assert.match(mediaSession, /video\.currentTime = target \/ 1000/)
  assert.match(mediaSession, /video\.removeAttribute\('src'\)/)
  assert.doesNotMatch(source + recordedSource, /new THREE\.VideoTexture|useTexture\(/)
})

test('Replay retains diegetic temporal reconstruction controls without turning the scene back into a media player', () => {
  assert.match(source, /ReplayTimelineField/)
  assert.match(source, /ReplayCameraRig/)
  assert.match(source, /ReplayMemoryAtmosphere/)
  assert.match(source, /name="replay-living-memory-atmosphere"/)
  assert.match(source, /className="memoryTempo" aria-label="Memory time"/)
  assert.match(source, /aria-label=\{locale.text\(playing \? 'replay.pause' : 'replay.continue'\)\}/)
  assert.equal(URAI_SOURCE_MESSAGES['replay.pause'].source, 'Pause memory')
  assert.equal(URAI_SOURCE_MESSAGES['replay.continue'].source, 'Continue memory')
  assert.match(source, /className="memoryTrace"/)
  assert.match(source, /className="memorySeek" type="range"/)
  assert.match(source, /\.memorySeek\{position:absolute;width:1px;height:1px;opacity:\.001;pointer-events:none\}/)
  assert.match(source, /\.memorySeek:focus-visible\{position:relative/)
  assert.doesNotMatch(source, /className="controls"|aria-label="Replay controls"|aria-label=\{playing \? 'Pause replay' : 'Play replay'\}/)
  assert.doesNotMatch(source, /<iframe/)
  assert.match(recordedSource, /<video ref=\{videoRef\}/)
  assert.match(source, /admission\.kind !== 'recorded-source' && webgl\.state === 'ready' \? <ReplayCanvasBoundary/)
})
