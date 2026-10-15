import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const authority = fs.readFileSync(new URL('../../apps/functions/src/councilGraphEvidenceAuthority.ts', import.meta.url), 'utf8')
const provider = fs.readFileSync(new URL('../../apps/functions/src/councilProviderFunctions.ts', import.meta.url), 'utf8')

test('memory evidence is source-restricted and cannot forward unrelated graph relationships', () => {
  assert.match(authority, /scopeCouncilMemoryEvidence/)
  assert.match(authority, /allowedClaims\.has\(claim\.id\)/)
  assert.match(authority, /claim\.sourceIds\.every\(\(id: string\) => allowedSources\.has\(id\)\)/)
  assert.match(authority, /COUNCIL_MEMORY_CLAIM_LINEAGE_MISMATCH/)
  assert.match(authority, /edges: \[\] as typeof evidence\.edges/)
  assert.match(authority, /evidence: scopeCouncilMemoryEvidence\(evidence, binding\)/)
})
test('selected-memory dispatch uses scoped evidence and no previous unrelated dialogue', () => {
  assert.match(provider, /graphEvidence = memoryBinding \? memoryBinding\.evidence/)
  assert.match(provider, /memoryRequest === undefined\s*\? await loadGraph\(\) : \(await resolveCouncilMemoryGraph\(db, uid, memoryRequest\)\)\.evidence/)
  assert.match(provider, /scopedContext = memoryRequest === undefined \? context : \[\]/)
  for (const family of ['callAnthropic', 'callGemini', 'callCompatible']) {
    assert.ok(provider.includes('groundedMessage, scopedContext, controller.signal'), family)
  }
})
