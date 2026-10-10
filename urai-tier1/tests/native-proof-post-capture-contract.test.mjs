import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const continuous = await readFile(new URL('../../scripts/capture-launch-route-matrix.mjs', import.meta.url), 'utf8')
const home = await readFile(new URL('../../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')
const workflow = await readFile(new URL('../../.github/workflows/home-state-proof.yml', import.meta.url), 'utf8')

test('continuous visual proof binds assertions to retained post-capture state', () => {
  assert.match(continuous, /const homeRenderCase = \\['\\/', '\\/home', '\\/ascent', '\\/onboarding', '\\/spatial'\\]/)
  assert.match(continuous, /const wideHomeCase = representative && spec\\.route === '\\/home'/)
  assert.match(continuous, /wideHomeCase \\? 220_000/)
  assert.match(continuous, /homeRenderCase \\? 165_000/)
  assert.match(continuous, /wideHomeCase \\? 140_000 : homeRenderCase \\? 100_000 : 30_000/)
  assert.match(continuous, /wideHomeCase \\? 90_000 : 60_000/)
  assert.match(continuous, /postStableSamples < 3/)
  assert.match(continuous, /post-screenshot-readiness-unstable/)
  assert.match(continuous, /unsettled-observable-owner/)
  assert.match(continuous, /width: 2560, height: 1440/)
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
