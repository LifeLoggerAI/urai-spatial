import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/personPresenceFunctions.ts', import.meta.url), 'utf8')

test('Person Presence uses compiled current non-synthetic bundles only', () => {
  assert.match(source, /personModelBundles/)
  assert.match(source, /bundle\.get\('state'\) !== 'current'/)
  assert.match(source, /bundle\.get\('synthetic'\) !== false/)
  assert.match(source, /urai-life-model-v1/)
})

test('historical presence requires a real knowledge cutoff', () => {
  assert.match(source, /HISTORICAL_AS_OF/)
  assert.match(source, /Historical presence requires a knowledge cutoff/)
})

test('Person Presence sessions are always synthetic and never historical source authority', () => {
  assert.match(source, /presentationClass: 'SIMULATED'/)
  assert.match(source, /syntheticOutputMayBecomeHistoricalSource: false/)
  assert.match(source, /historicalSourceAuthority: false/)
})

test('Person Presence requires explicit interaction, model and identity consent', () => {
  assert.match(source, /INTERACTIVE_PRESENCE_CONSENT_REQUIRED/)
  assert.match(source, /MODEL_CONTEXT_NOT_AUTHORIZED/)
  assert.match(source, /IDENTITY_MODEL_NOT_AUTHORIZED/)
})
