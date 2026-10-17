import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { URAI_SOURCE_MESSAGES } from '../src/lib/i18n/locales.ts'

const replay = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const focus = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')

test('Replay no-selection state is a designed memory horizon, not an error dead end', () => {
  assert.doesNotMatch(replay, /Replay unavailable/)
  assert.doesNotMatch(replay, /Return to Focus/)
  assert.match(replay, /data-replay-neutral="memory-horizon"/)
  assert.match(replay, /'replay.comingIntoView' : 'replay.choosePrompt'/)
  assert.equal(URAI_SOURCE_MESSAGES['replay.choosePrompt'].source, 'Choose a memory to enter Replay.')
  assert.match(replay, /locale.text\('replay.chooseMemory'\)/)
  assert.equal(URAI_SOURCE_MESSAGES['replay.chooseMemory'].source, 'Choose a memory')
  assert.match(replay, /destination: 'life-map'/)
  assert.match(replay, /entryPortal: 'replay-memory-horizon'/)
  assert.match(replay, /@media\(max-width:700px\)/)
  assert.match(replay, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(replay, /@media\(forced-colors:active\)/)
})

test('Neutral Focus offers the real Life Map action and no inactive Replay doorway', () => {
  assert.match(focus, /memory \? <button type="button" className="primary"[^>]+onClick=\{enterReplay\}/)
  assert.match(focus, /<div className="neutralActions"><button type="button" onClick=\{unwind\}[^>]+>\{locale.text\('focus.openLifeMap'\)\}<\/button>/)
  assert.equal(URAI_SOURCE_MESSAGES['focus.openLifeMap'].source, 'Open Life Map')
  assert.doesNotMatch(focus, /<button[^>]+className="focus-spatial-aperture-button"/)
})
