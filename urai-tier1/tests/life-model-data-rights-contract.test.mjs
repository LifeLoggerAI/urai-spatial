import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts', import.meta.url), 'utf8')
const authority = fs.readFileSync(new URL('../../apps/functions/src/personPresenceAuthority.ts', import.meta.url), 'utf8')

test('Life Model has a dedicated portable export scope', () => {
  assert.match(source, /'life-model'/)
  for (const name of ['lifeEntities','lifeEntityStates','lifeClaims','lifeRelationships','lifeEvents','lifeCorrections','lifeConflicts','knowledgeGaps','personModelBundles','sceneTruthPackets','renderManifests','simulationSessions','lifeModelReceipts']) {
    assert.ok(source.includes(`collection('${name}')`) || source.includes(`'${name}'`), name)
  }
})

test('Life Model has a dedicated deletion scope and all-data deletion includes it', () => {
  assert.match(source, /'life-model': \[/)
  assert.match(source, /'all-repository-data': \[/)
  assert.match(source, /'personModelBundles'/)
  assert.match(source, /'simulationSessions'/)
})

test('model or identity consent revocation revokes compiled derivatives', () => {
  assert.match(source, /revokeLifeModelDerivativesForConsent/)
  assert.match(source, /domain === 'models' \|\| domain === 'identity'/)
  assert.match(source, /revokePersonPresenceConsentDerivatives\(db, uid, reasonId/)
  assert.match(authority, /reasonId, true, timestamp/)
})


test('accepted voice/visual/motion bindings participate in owner rights and consent revocation',()=>{
  assert.match(source,/data\.personRenderBindings/)
  assert.match(source,/'personRenderBindings'/)
  assert.match(source,/revokePersonPresenceConsentDerivatives\(db, uid, reasonId/)
  assert.match(authority,/\['personModelBundles','personRenderBindings','sceneTruthPackets','renderManifests','simulationSessions'\]/)
})
