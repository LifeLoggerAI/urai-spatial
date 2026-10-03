import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const rules = fs.readFileSync(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8')
const privacy = fs.readFileSync(new URL('../../privacy/feature-manifests/life-graph-person-model.privacy.yaml', import.meta.url), 'utf8')

test('Life Graph collections are owner-readable and client-write closed', () => {
  for (const collection of [
    'lifeEntities','lifeEntityStates','lifeClaims','lifeRelationships','lifeEvents',
    'lifeCorrections','lifeConflicts','knowledgeGaps','personModelBundles',
    'sceneTruthPackets','renderManifests','simulationSessions','lifeModelReceipts',
  ]) {
    const start = rules.indexOf(`match /${collection}/{docId}`)
    assert.notEqual(start, -1, `missing Firestore boundary for ${collection}`)
    const slice = rules.slice(start, start + 180)
    assert.match(slice, /allow read: if isSelf\(uid\);/)
    assert.match(slice, /allow write: if false;/)
  }
})

test('privacy manifest makes the synthetic-memory firewall and revocation propagation explicit', () => {
  assert.match(privacy, /syntheticOutputMayBecomeHistoricalSource: false/)
  assert.match(privacy, /dependentBundlesInvalidated: true/)
  assert.match(privacy, /dependentRendersUnloaded: true/)
  assert.match(privacy, /providerNeutralIdentityRequired: true/)
})
