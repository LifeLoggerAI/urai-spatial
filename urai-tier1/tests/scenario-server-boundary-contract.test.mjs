import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const ops = fs.readFileSync(new URL('../../apps/functions/src/scenarioOperations.ts', import.meta.url), 'utf8')
const provider = fs.readFileSync(new URL('../../apps/functions/src/scenarioProvider.ts', import.meta.url), 'utf8')
const ledger = fs.readFileSync(new URL('../../apps/functions/src/aiLedgerOperations.ts', import.meta.url), 'utf8')
const index = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')

test('Scenario server API is owner-scoped, revision-aware and manual-fallback truthful', () => {
  assert.match(ops, /users\/\$\{ownerId\}\/scenarios\/\$\{scenarioId\}/)
  assert.match(ops, /SCENARIO_BASIS_REVISION_CONFLICT/)
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

test('callables are exported through canonical Functions index', () => {
  for (const name of ['createPossibleFuture','generatePossibleFutureBranches','getPossibleFuture','recordPossibleFutureOutcome','getGlobalEmotionalFieldSnapshot']) assert.match(index, new RegExp(name))
})
