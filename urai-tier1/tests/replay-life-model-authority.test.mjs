import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const server = fs.readFileSync(new URL('../../apps/functions/src/lifeModelFunctions.ts', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/spatial/life-model/useReplayLifeModelAuthority.ts', import.meta.url), 'utf8')
const replay = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')

test('Replay authority resolves current canonical SceneTruth and Person Model bundles server-side', () => {
  assert.match(server, /getReplayLifeModelAuthority/)
  assert.match(server, /SCENE_TRUTH_REQUIRED/)
  assert.match(server, /sceneTruthPackets/)
  assert.match(server, /personModelBundles/)
  assert.match(server, /syntheticOutputMayBecomeHistoricalSource/)
})

test('Replay blocks generated world escalation when canonical authority is unavailable', () => {
  assert.match(replay, /useReplayLifeModelAuthority/)
  assert.match(replay, /const governedMemoryId = lifeModelAuthority\.available \? memory\.id : null/)
  assert.match(replay, /useCapturedRealityReplayLookup\(governedMemoryId\)/)
  assert.match(replay, /useInterpretiveWorldReplayEntry\(governedMemoryId\)/)
  assert.match(replay, /memory\.demo \|\| lifeModelAuthority\.available/)
})

test('Replay visibly distinguishes archive fallback from governed reconstruction', () => {
  assert.match(replay, /archive replay · reconstruction held/)
  assert.match(replay, /data-life-model-authority/)
  assert.match(client, /urai-life-model-v1/)
})
