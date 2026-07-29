import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const manifest = read('src/spatial/audio/ambientAudioManifest.ts')
const controller = read('src/spatial/audio/useAudioController.ts')

const placeholders = [
  'public/audio/ambient/home.mp3',
  'public/audio/ambient/ascent.mp3',
  'public/audio/ambient/lifemap.mp3',
  'public/audio/ambient/focus.mp3',
  'public/audio/ambient/replay.mp3',
]

test('zero-byte ambient placeholders are classified missing and never runtime-ready', () => {
  for (const placeholder of placeholders) {
    assert.equal(fs.statSync(path.join(root, placeholder)).size, 0, `${placeholder} must remain classified as a zero-byte placeholder until replaced`)
  }
  assert.equal((manifest.match(/status: 'missing'/g) ?? []).length, 5)
  assert.equal((manifest.match(/path: null/g) ?? []).length, 5)
  assert.equal((manifest.match(/fallback: 'silence'/g) ?? []).length, 5)
  assert.match(manifest, /resolveReadyAmbientAudioPath/)
  assert.match(manifest, /asset\.status === 'ready' \? asset\.path : null/)
})

test('audio controller resolves ambient paths through the fail-closed manifest', () => {
  assert.match(controller, /resolveReadyAmbientAudioPath/)
  assert.match(controller, /const nextSrc = resolveReadyAmbientAudioPath\(nextTrack\)/)
  assert.match(controller, /if \(!nextSrc\) \{[\s\S]*stopAmbient\(\)/)
  assert.match(controller, /urai-audio-ambient-unavailable/)
  assert.match(controller, /fallback: "silence"/)
  assert.doesNotMatch(controller, /\/audio\/ambient\/(home|ascent|lifemap|focus|replay)\.mp3/)
})

test('missing ambient playback cannot suppress narrator and accessibility output', () => {
  assert.match(controller, /const playGoogle/)
  assert.match(controller, /const playElevenLabs/)
  assert.match(controller, /window\.speechSynthesis\.speak/)
  assert.match(controller, /if \(!nextSrc\)[\s\S]*return;/)
  assert.match(controller, /getAudioState/)
  assert.match(controller, /ambientTrack: ambientTrackRef\.current/)
})
