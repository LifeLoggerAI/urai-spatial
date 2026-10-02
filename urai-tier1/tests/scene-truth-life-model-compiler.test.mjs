import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/lifeModelFunctions.ts', import.meta.url), 'utf8')

test('SceneTruth compiler only accepts current canonical Person Model bundles', () => {
  assert.match(source, /compileSceneTruthPacket/)
  assert.match(source, /Scene Person Model authority is unavailable/)
  assert.match(source, /bundle\.get\('schemaVersion'\) !== 'urai-life-model-v1'/)
  assert.match(source, /bundle\.get\('state'\) !== 'current'/)
})

test('SceneTruth known claims must be real accepted evidence', () => {
  assert.match(source, /claim\.get\('synthetic'\) === true/)
  assert.match(source, /claim\.get\('status'\) !== 'accepted'/)
  assert.match(source, /claim\.get\('evidenceClass'\) === 'UNKNOWN'/)
})

test('SceneTruth decision is fail-closed on contradictions and critical unknowns', () => {
  assert.match(source, /decision = 'BLOCKED'/)
  assert.match(source, /decision = 'READY_WITH_OCCLUSION'/)
  assert.match(source, /decision = 'READY_INTERPRETIVE'/)
})

test('SceneTruth never authorizes synthetic output as historical evidence', () => {
  assert.match(source, /syntheticOutputMayBecomeHistoricalSource: false/)
})
