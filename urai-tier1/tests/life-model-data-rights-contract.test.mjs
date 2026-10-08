import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const source = fs.readFileSync(new URL('../../apps/functions/src/privacyOperations.ts', import.meta.url), 'utf8')
const authority = fs.readFileSync(new URL('../../apps/functions/src/personPresenceAuthority.ts', import.meta.url), 'utf8')

let revocationProof
function requireActualRevocationProof() {
  if (!revocationProof) {
    const childEnv = { ...process.env }
    // A separately invoked test runner emits TAP, not its parent's V8 IPC stream.
    delete childEnv.NODE_TEST_CONTEXT
    // Execute the actual current consent worker against controlled SDK boundaries.
    // The public gate checks owner-rights outcomes rather than a retired helper name.
    revocationProof = spawnSync(process.execPath, ['--test', '--test-name-pattern',
      'owner rights revocation:|derivative revocation is in the same atomic|the 101st derivative|no postcommit destructive',
      fileURLToPath(new URL('../../apps/functions/test/privacy-consent-worker-lifecycle.test.js', import.meta.url))],
      { encoding: 'utf8', timeout: 30000, env: childEnv })
  }
  assert.equal(revocationProof.status, 0, revocationProof.stdout + revocationProof.stderr)
  for (const domain of ['models', 'identity']) for (const mode of ['denied', 'paused']) {
    assert.ok(revocationProof.stdout.includes('owner rights revocation: ' + domain + ' ' + mode), domain + ' ' + mode)
  }
  return revocationProof.stdout
}

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
  requireActualRevocationProof()
})


test('accepted voice/visual/motion bindings participate in owner rights and consent revocation',()=>{
  assert.match(source,/data\.personRenderBindings/)
  assert.match(source,/'personRenderBindings'/)
  assert.match(requireActualRevocationProof(), /no postcommit destructive callback can revoke new derivatives after a successor grant/)
  assert.match(authority,/\['personModelBundles','personRenderBindings','sceneTruthPackets','renderManifests','simulationSessions'\]/)
})
