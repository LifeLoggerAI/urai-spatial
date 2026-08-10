import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const replay = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const focusCss = fs.readFileSync(new URL('../src/app/focus/focus-stable-controls.css', import.meta.url), 'utf8')

test('Replay no-selection state is a designed memory horizon, not an error dead end', () => {
  assert.doesNotMatch(replay, /Replay unavailable/)
  assert.doesNotMatch(replay, /Return to Focus/)
  assert.match(replay, /data-replay-neutral="memory-horizon"/)
  assert.match(replay, /Choose a memory to enter its reconstruction\./)
  assert.match(replay, /Choose a memory/)
  assert.match(replay, /destination: 'life-map'/)
  assert.match(replay, /entryPortal: 'replay-memory-horizon'/)
  assert.match(replay, /@media\(max-width:700px\)/)
  assert.match(replay, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(replay, /@media\(forced-colors:active\)/)
})

test('Neutral Focus threshold never exposes waiting-room copy visually', () => {
  assert.match(focusCss, /\.focus-spatial-aperture-button:disabled\s*\{[\s\S]*font-size:\s*0/)
  assert.match(focusCss, /\.focus-spatial-aperture-button:disabled::after\s*\{[\s\S]*content:\s*'Choose a memory'/)
})
