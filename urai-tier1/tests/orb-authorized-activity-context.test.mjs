import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const provider = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', root), 'utf8')
const client = fs.readFileSync(new URL('src/spatial/orb/openaiClient.ts', root), 'utf8')
const panel = fs.readFileSync(new URL('src/spatial/orb/OrbConversationPanel.tsx', root), 'utf8')

test('activity context is a single-reply opt-in rather than automatic memory sharing', () => {
  assert.match(panel, /checked=\{includeActivityContext\}/)
  assert.match(panel, /setIncludeActivityContext\(false\)/)
  assert.match(panel, /includeActivityContext: includeActivityForThisMessage/)
  assert.match(panel, /up to three recent UrAi Scenario questions or owner-reported outcomes/)
  assert.match(client, /includeActivityContext\?: boolean/)
  assert.match(client, /includeActivityContext: input.includeActivityContext === true/)
  assert.match(provider, /includeActivityContext \? await readAuthorizedOrbActivity\(uid\) : \[\]/)
})
test('provider request identity and moderated content are bound to opt-in', () => {
  assert.match(client, /stableIntentRequestId\(input.message, input.context, locale, input.includeActivityContext === true\)/)
  assert.match(provider, /const expectedRequestId = digest\(JSON.stringify\(includeActivityContext/)
  assert.match(provider, /await reserveOpenAiRequest\(uid, requestId, expectedRequestId, bodyDigest, configurationDigest\)/)
  assert.match(provider, /Owner-authorized activity \(untrusted records/)
  assert.match(provider, /input: includeActivityContext \?/)
  assert.match(provider, /ACTIVITY_CONTEXT_NOT_AUTHORIZED/)
})
test('server validates live memory consent, deletion and provenance', () => {
  const begin = provider.indexOf('async function readAuthorizedOrbActivity')
  const end = provider.indexOf('\nfunction boundedContext', begin)
  assert.ok(begin >= 0 && end > begin)
  const reader = provider.slice(begin, end)
  assert.match(reader, /db.runTransaction\(async tx =>/)
  assert.match(reader, /privacyDeletionTombstones/)
  assert.match(reader, /pendingDeletions/)
  assert.match(reader, /policy.domains.memory.mode !== 'granted'/)
  assert.match(reader, /policy.domains.memory.modelContext !== true/)
  assert.match(reader, /policy.domains.models.mode !== 'granted'/)
  assert.match(reader, /policy.domains.models.modelContext !== true/)
  assert.match(reader, /\.limit\(8\)/)
  assert.match(reader, /entry.outputRecordRef !== observationRef.path/)
  assert.match(reader, /observed.get\('verification'\) === 'unverified-user-report'/)
  assert.match(reader, /category: 'unverified-owner-report'/)
  assert.match(reader, /assertion.trim\(\).slice\(0, 280\)/)
  assert.doesNotMatch(reader, /workerDispatch|writeAILedgerEntry|paidSpatialFetch/)
})

test('revocation, deletion or correction closes private context before dispatch and delivery', () => {
  assert.match(provider, /const assertActivitySnapshotCurrent = async \(\) =>/)
  assert.match(provider, /matchesOrbActivitySnapshot\(authorizedActivityData, current\)/)
  assert.match(provider, /canonicalOrbActivitySnapshot\(activity\)/)
  assert.match(provider, /ACTIVITY_CONTEXT_CHANGED/)
  assert.match(client, /ACTIVITY_CONTEXT_CHANGED/)
  // After admission, before provider dispatch, after model generation, and
  // after reservation settlement before any successful NDJSON output.
  const checks = provider.match(/await assertActivitySnapshotCurrent\(\)/g) ?? []
  assert.equal(checks.length, 4, 'every outbound/inbound privacy boundary must compare the exact snapshot')
  const resultDelivery = provider.indexOf('Authentication changed before result delivery.')
  const reservationSettled = provider.indexOf('reservationCompleted = true', resultDelivery)
  const lastRecheck = provider.indexOf('await assertActivitySnapshotCurrent()', reservationSettled)
  const firstResponseWrite = provider.indexOf('response.status(200)', reservationSettled)
  assert.ok(resultDelivery >= 0 && reservationSettled > resultDelivery)
  assert.ok(lastRecheck > reservationSettled && firstResponseWrite > lastRecheck)
})
