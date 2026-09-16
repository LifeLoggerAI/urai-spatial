import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const ops = fs.readFileSync(new URL('../../apps/functions/src/scenarioOperations.ts', import.meta.url), 'utf8')
const provider = fs.readFileSync(new URL('../../apps/functions/src/scenarioProvider.ts', import.meta.url), 'utf8')
const ledger = fs.readFileSync(new URL('../../apps/functions/src/aiLedgerOperations.ts', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const rules = fs.readFileSync(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8')

test('Scenario server API is owner-scoped, revision-aware and manual-fallback truthful', () => {
  assert.match(ops, /users\/\$\{ownerId\}\/scenarios\/\$\{scenarioId\}/)
  assert.match(ops, /SCENARIO_BASIS_REVISION_CONFLICT/)
  assert.match(ops, /SCENARIO_REQUIRES_AUTHORIZED_EVIDENCE_OR_EXPLICIT_ASSUMPTION_ONLY/)
  assert.match(ops, /SCENARIO_BRANCH_EVIDENCE_OUTSIDE_BASIS/)
  assert.match(ops, /provider-unavailable/)
  assert.match(ops, /manual-scenario/)
  assert.match(ops, /db\.recursiveDelete\(ref\)/)
})

test('Scenario provider is intentionally disabled until exact model/version governance exists', () => {
  assert.match(provider, /activated: false/)
  assert.match(provider, /PROVIDER_NOT_ACTIVATED/)
  assert.match(provider, /modelVersion/)
})

test('Self-ledger rejects hidden reasoning and requires provider model version', () => {
  assert.match(ledger, /AI_LEDGER_HIDDEN_REASONING_FORBIDDEN/)
  assert.match(ledger, /AI_LEDGER_PROVIDER_REQUIRES_EXACT_MODEL_VERSION/)
  assert.doesNotMatch(ledger, /chainOfThought:/)
})

test('Scenario and Self-Ledger user records are owner-readable but client-write denied', () => {
  assert.match(rules, /match \/scenarios\/\{scenarioId\} \{[\s\S]*allow read: if isSelf\(uid\) \|\| isAdmin\(\);[\s\S]*allow write: if false;/)
  assert.match(rules, /match \/aiLedger\/\{entryId\} \{[\s\S]*allow read: if isSelf\(uid\) \|\| isAdmin\(\);[\s\S]*allow write: if false;/)
})

test('Scenario receipts and Global Emotional Field working collections are server-only', () => {
  for (const path of ['scenarioProviderReceipts','globalEmotionalFieldIntake','globalEmotionalFieldBatches','globalEmotionalFieldCells','globalEmotionalFieldRiskAssessments','globalEmotionalFieldPublicationReceipts']) {
    assert.match(rules, new RegExp(`match \\/${path}\\/\\{docId\\} \\{ allow read, write: if false; \\}`))
  }
})

test('callables are exported through canonical Functions index', () => {
  for (const name of ['createPossibleFuture','generatePossibleFutureBranches','getPossibleFuture','recordPossibleFutureOutcome','calibratePossibleFutureOutcome','getGlobalEmotionalFieldSnapshot']) assert.match(index, new RegExp(name))
})
