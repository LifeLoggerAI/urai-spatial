import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const scenario = fs.readFileSync(new URL('../../apps/functions/src/scenarioOperations.ts', root), 'utf8')
const ledger = fs.readFileSync(new URL('../../apps/functions/src/aiLedgerOperations.ts', root), 'utf8')
const after = scenario.slice(scenario.indexOf('export const recordPossibleFutureOutcome'), scenario.indexOf('export const deletePossibleFuture'))

test('untrusted outcome references cannot become independent observations', () => {
  assert.match(after, /INDEPENDENT_OUTCOME_EVIDENCE_VERIFICATION_UNAVAILABLE/)
  assert.match(after, /CLIENT_OUTCOME_TRUTH_REFS_FORBIDDEN/)
  assert.match(after, /source === 'observation'/)
  assert.match(after, /source: 'user-assertion', truthKind: 'user-assertion'/)
  assert.match(after, /verification: 'unverified-user-report'/)
  assert.match(after, /observedTruthRecordIds: \[\]/)
  assert.match(after, /assertion\.length > 1200/)
})

test('owner, branch, deletion and memory authority are transactionally checked', () => {
  assert.match(after, /await requireCurrentScenarioOwner\(tx, ownerId\)/)
  assert.match(after, /tx\.get\(ref\)/)
  assert.match(after, /tx\.get\(ref\.collection\('branches'\)\.doc\(branchId\)\)/)
  assert.match(after, /activeIds\.includes\(branchId\)/)
  assert.match(after, /branchSnap\.get\('ownerId'\) !== ownerId/)
  assert.match(after, /branchSnap\.get\('truthKind'\) !== 'scenario'/)
  assert.match(after, /policy\.domains\.memory\.mode !== 'granted'/)
  assert.match(after, /tx\.create\(outcomeRef/)
  assert.match(after, /stableReceipt\(ownerId, scenarioId \+ ':' \+ op/)
  assert.match(after, /requestDigest/)
})

test('AI Ledger distinguishes user report from verified observation', () => {
  assert.match(ledger, /kind: verified \? 'outcome-observation' : 'outcome-report'/)
  assert.match(ledger, /truthKind: verified \? 'observation' : 'user-assertion'/)
  assert.match(ledger, /support: verified \? 'medium' : 'low'/)
  assert.match(ledger, /Owner-reported outcome; not independently verified/)
  assert.match(ledger, /outputRecordRef: snapshot\.ref\.path/)
  assert.match(ledger, /scenario\.get\('status'\) === 'discarded'/)
  assert.match(ledger, /privacyDeletionTombstones/)
  assert.match(ledger, /if \(!existing\.exists\) tx\.create\(entryRef/)
})
