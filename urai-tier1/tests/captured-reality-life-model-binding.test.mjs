import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/capturedReality.ts', import.meta.url), 'utf8')

test('launch-enabled Captured Reality requires canonical Life Model authority', () => {
  assert.match(source, /releaseState === 'launch-enabled'/)
  assert.match(source, /requireCapturedRealityLifeModelAuthority/)
  assert.match(source, /lifeModelSchemaVersion/)
  assert.match(source, /sceneTruthPackets/)
  assert.match(source, /personModelBundles/)
})

test('Captured Reality refuses stale, blocked or synthetic SceneTruth', () => {
  assert.match(source, /scene\.get\('state'\) !== 'current'/)
  assert.match(source, /syntheticOutputMayBecomeHistoricalSource/)
  assert.match(source, /READY_WITH_OCCLUSION/)
})

test('current private pilot and beta remain governed by their existing release gates', () => {
  assert.match(source, /\['private-pilot', 'private-beta', 'launch-enabled'\]/)
})
