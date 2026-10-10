import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const continuous = await readFile(new URL('../../scripts/capture-launch-route-matrix.mjs', import.meta.url), 'utf8')
const home = await readFile(new URL('../../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')
const workflow = await readFile(new URL('../../.github/workflows/home-state-proof.yml', import.meta.url), 'utf8')

test('continuous visual proof binds assertions to retained post-capture state', () => {
  assert.match(continuous, /representative && homeCase \? 160_000/)
  assert.match(continuous, /: 110_000/)
  assert.match(continuous, /representative && homeCase \? 100_000 : 30_000/)
  assert.match(continuous, /postStableSamples < 3/)
  assert.match(continuous, /post-screenshot-readiness-unstable/)
  assert.match(continuous, /unsettled-observable-owner/)
  assert.ok(continuous.indexOf('record.image = {') < continuous.indexOf('record.observedState = classifyState'))
})

test('Home state proof retains actionability and uses the declared keyboard path', () => {
  assert.match(home, /messageActionabilityAfterConsent/)
  assert.match(home, /messageActionabilityBeforeTyping/)
  assert.match(home, /timeout: 90_000/)
  assert.match(home, /page\.keyboard\.type\(reflectionPrompt/)
  assert.match(home, /record\.messageInput = 'native-keyboard'/)
  assert.doesNotMatch(home, /message\.fill\('Give me a short grounded reflection\.'/)
  assert.match(workflow, /timeout-minutes: 75/)
})
