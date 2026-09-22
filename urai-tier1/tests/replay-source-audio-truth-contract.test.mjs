import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync(new URL('../src/spatial/audio/SpatialAmbientRuntime.tsx', import.meta.url), 'utf8')

test('Replay does not auto-mount generic ambient audio when source audio is absent', () => {
  assert.match(runtime, /replay: 'Replay is source-audio-first/)
  assert.match(runtime, /if\(destination==='replay'\) return null;/)
  assert.match(runtime, /if\(!spatialPhase\)\{audio\.stopAmbient\(\)/)
})

test('Replay silence remains an accessible authored state', () => {
  assert.match(runtime, /SILENT_DESTINATION_CAPTIONS\[world\.destination\]/)
  assert.match(runtime, /role="status"/)
  assert.match(runtime, /aria-live="polite"/)
})
