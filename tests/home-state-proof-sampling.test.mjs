import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const script = fs.readFileSync(new URL('../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')

test('Home visual proof bounds expensive PNG captures without lowering visual thresholds', () => {
  assert.match(script, /const sampleInterval = Math\.max\(1, Math\.ceil\(frameBudget \/ 2\)\)/)
  assert.match(script, /frameBudget = 240/)
  assert.match(script, /minimumViewportCoverage: 0\.82/)
  assert.match(script, /minimumLuminanceRange: 12/)
  assert.match(script, /minimumVisibleSamples: 3/)
  assert.match(script, /luminanceRange >= receipt\.visualGate\.minimumLuminanceRange/)
  assert.match(script, /visibleSamples >= receipt\.visualGate\.minimumVisibleSamples/)
})
