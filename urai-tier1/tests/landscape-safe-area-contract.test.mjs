import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')

test('landscape Focus columns reserve horizontal safe-area insets', () => {
  assert.match(focus, /width:calc\(50vw - 40px - env\(safe-area-inset-left\)\)/)
  assert.match(focus, /width:calc\(50vw - 40px - env\(safe-area-inset-right\)\)/)
  assert.match(focus, /max-width:calc\(50vw - 40px - env\(safe-area-inset-right\)\)/)
})

test('landscape Replay columns reserve horizontal safe-area insets', () => {
  assert.match(replay, /width:calc\(50vw - 36px - env\(safe-area-inset-left\)\)/)
  assert.match(replay, /width:calc\(50vw - 36px - env\(safe-area-inset-right\)\)/)
  assert.match(replay, /max-width:calc\(50vw - 36px - env\(safe-area-inset-right\)\)/)
})
