import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const orb = fs.readFileSync(new URL('src/spatial/orb/OrbConversationPanel.tsx', root), 'utf8')
const futures = fs.readFileSync(new URL('src/app/possible-futures/PossibleFuturesClient.tsx', root), 'utf8')
const operations = fs.readFileSync(new URL('../../apps/functions/src/scenarioOperations.ts', root), 'utf8')

test('Orb offers explicit and owner-bound What-If creation, not automatic execution', () => {
  assert.match(orb, /Explore this question in Possible Futures/)
  assert.match(orb, /onClick=\{\(\) => void exploreWhatIf\(\)\}/)
  assert.match(orb, /isCurrentAIActorSnapshot\(actor\)/)
  assert.match(orb, /createPossibleFutureClient\(\{/)
  assert.match(orb, /assumptionOnly: true/)
  assert.match(orb, /originRealm: 'home'/)
  assert.match(orb, /truthMode: 'scenario'/)
  assert.match(orb, /scenarioId: created\.scenarioId/)
  assert.match(orb, /requestUraiWorldTravel\(\{/)
  assert.match(orb, /No AI or workers are being started/)
  assert.doesNotMatch(orb, /requestPossibleFutureGenerationClient/)
  assert.doesNotMatch(orb, /requestCouncilProvider/)
})

test('Returning to a newly created Scenario supports real manual fallback', () => {
  assert.match(futures, /scenarioStatus === 'awaiting-assumptions' && !ids\.length/)
  assert.match(futures, /setSetup\('manual'\)/)
  assert.match(futures, /String\(result\.scenario\?\.question \?\? ''\)/)
  assert.match(futures, /no AI generated a prediction/)
  assert.match(futures, /scenarioStatus === 'ready' \|\| scenarioStatus === 'saved'/)
  assert.match(futures, /setSetup\('error'\)/)
})

test('Scenario creation and branch writes cannot revive a deleted owner', () => {
  assert.match(operations, /async function requireCurrentScenarioOwner/)
  assert.match(operations, /privacyDeletionTombstones/)
  assert.match(operations, /pendingDeletions/)
  assert.match(operations, /owner\.get\('deleted'\) === true/)
  const calls = operations.match(/await requireCurrentScenarioOwner\(tx, ownerId\)/g) ?? []
  assert.equal(calls.length, 3, 'Create, provider-unavailable and manual branches must check the owner')
})
