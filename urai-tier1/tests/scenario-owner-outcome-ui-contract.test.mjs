import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const component = fs.readFileSync(new URL('src/spatial/scenario/PossibleFutureOutcomeReport.tsx', root), 'utf8')
const client = fs.readFileSync(new URL('src/lib/scenario/scenarioClient.ts', root), 'utf8')
const world = fs.readFileSync(new URL('src/app/possible-futures/PossibleFuturesClient.tsx', root), 'utf8')
const server = fs.readFileSync(new URL('../../apps/functions/src/scenarioOperations.ts', root), 'utf8')

test('What-If owner outcome is explicitly acknowledged and never marked verified', () => {
  assert.match(world, /PossibleFutureOutcomeReport scenarioId=\{scenarioId\} branchId=\{branchIds\[branch\]\}/)
  assert.match(component, /type="checkbox" checked=\{acknowledged\}/)
  assert.match(component, /I understand UrAi will store this as my unverified report/)
  assert.match(component, /Save my unverified outcome report/)
  assert.match(component, /saved\.verified !== false/)
  assert.match(component, /saved\.source !== 'user-assertion'/)
  assert.match(component, /isCurrentAIActorSnapshot\(actor\)/)
  assert.match(client, /'recordPossibleFutureOutcome'/)
  assert.match(client, /source: 'user-assertion'/)
  assert.doesNotMatch(client, /observedTruthRecordIds: \[/)
})

test('Retries reuse the operation ID for precisely the same report', () => {
  assert.match(component, /attempt\.current\.fingerprint !== fingerprint/)
  assert.match(component, /operationId: attempt\.current\.operationId/)
  assert.match(component, /attempt\.current = null/)
  assert.match(component, /key=\{`\$\{actor\.generation\}:\$\{scenarioId\}:\$\{branchId\}`\}/)
  assert.match(server, /existing\.get\('requestDigest'\) !== requestDigest/)
  assert.match(server, /idempotent/)
})
