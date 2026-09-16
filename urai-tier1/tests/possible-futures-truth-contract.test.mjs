import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { validateTruthRecord, assertRealityIsolation } from '../src/lib/truth/truthValidation.ts'
import { scenarioEntityId, scenarioMayTriggerExternalAction } from '../src/lib/scenario/scenarioPolicy.ts'
import { validateScenarioProviderResult } from '../src/lib/scenario/scenarioValidation.ts'

const worldTypes = fs.readFileSync(new URL('../src/spatial/world/worldTypes.ts', import.meta.url), 'utf8')
const destinationRegistry = fs.readFileSync(new URL('../src/spatial/world/destinationRegistry.ts', import.meta.url), 'utf8')
const route = fs.readFileSync(new URL('../src/app/possible-futures/PossibleFuturesClient.tsx', import.meta.url), 'utf8')

test('possible futures is one canonical scenario-world destination and visibly not memory', () => {
  assert.match(worldTypes, /'possible-futures'/)
  assert.match(worldTypes, /'scenario-world'/)
  assert.match(worldTypes, /UraiTruthMode = 'reality' \| 'memory' \| 'interpretation' \| 'scenario'/)
  assert.match(destinationRegistry, /href: '\/possible-futures'/)
  assert.match(route, /POSSIBLE FUTURE · NOT A MEMORY/)
  assert.doesNotMatch(route, /\/dream/)
})

test('truth authority rejects factual high confidence without sources and scenario promotion to observation', () => {
  const errors = validateTruthRecord({ id: 't1', ownerId: 'u1', kind: 'observation', value: 'x', sourceRefs: [], support: 'high', userCorrectionRevision: 0, createdAt: '2026-09-16T00:00:00Z', updatedAt: '2026-09-16T00:00:00Z' })
  assert.ok(errors.includes('HIGH_SUPPORT_REQUIRES_SOURCE'))
  assert.throws(() => assertRealityIsolation('scenario', 'observation'), /TRUTH_PROMOTION_FORBIDDEN/)
})

test('scenario provider cannot invent evidence or escape scenario namespace', () => {
  const errors = validateScenarioProviderResult({
    branches: [{ id: 'br_a', label: 'A', assumptionIds: [], eventIds: ['sev_1'], entityStateIds: ['bad'], uncertaintyIds: [], outcomeIds: [], confidence: { evidenceCoverage: 'low', assumptionRisk: 'low', uncertainty: 'high' } }],
    events: [{ id: 'sev_1', truthKind: 'scenario', relativeTime: 'later', changedEntityIds: ['bad'], assumptionIds: [], evidenceRefIds: ['evr_invented'], mechanism: 'generated-context', summary: 'hypothetical', uncertaintyIds: [] }],
    entityStates: [{ id: 'bad', scenarioBranchId: 'br_a', truthKind: 'scenario', state: {} }],
    outcomes: [], uncertainties: [], evidenceRefIds: ['evr_invented'],
  }, ['evr_allowed'])
  assert.ok(errors.some((error) => error.includes('INVENTED_EVIDENCE')))
  assert.ok(errors.some((error) => error.includes('NAMESPACE_INVALID')))
})

test('scenario entity ids are isolated and scenarios cannot directly trigger external actions', () => {
  assert.match(scenarioEntityId('scn_one', 'br_a', 'place:home'), /^scn_one_a_/)
  assert.equal(scenarioMayTriggerExternalAction(), false)
})
