'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { lifeMapAuthorityBinding, projectCanonicalMemory, readLifeMapProjection } = require('../lib/apps/functions/src/lifeMapProjection.js')

const uid = 'synthetic-owner', now = 1800000000000
function fixture() {
  const state = {
    user: { uid }, accountFence: false, tombstone: { uid, active: false }, pendingDeletion: false,
    grant: { uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status: 'granted', receiptHash: 'a'.repeat(64), expiresAt: now + 60000 },
    policy: { ownerId: uid, version: 2, revision: 4, domains: { memory: { mode: 'granted', lifeMapVisible: true } },
      enforcement: { state: 'fully-enforced', jobId: 'enforcement-job', affectedTargets: ['life-map-visibility'] } },
    applied: { ownerId: uid, domain: 'memory', target: 'life-map-visibility', revision: 4, sourceJobId: 'enforcement-job', mode: 'granted', enabled: true, lifeMapVisible: true },
  }
  const memory = { ownerId: uid, demo: false, deleted: false, consentState: 'authorized', title: 'Synthetic memory', summary: 'Synthetic test content', occurredAt: now - 1000 }
  const stats = { ownerChecks: 0, memoryReads: 0, authorityReads: 0 }
  const deps = {
    now: () => now,
    verifyOwner: async () => { stats.ownerChecks++ },
    readAuthority: async () => { stats.authorityReads++; return state },
    readMemories: async () => { stats.memoryReads++; return [{ id: 'synthetic-memory', data: memory }] },
  }
  return { state, memory, stats, deps }
}

test('authorized synthetic canonical owner gets bounded metadata without a playback capability', async () => {
  const f = fixture(), result = await readLifeMapProjection(uid, f.deps)
  assert.equal(result.state, 'available')
  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].id, 'synthetic-memory')
  assert.equal(result.events[0].replayAvailable, false)
  assert.equal(result.validUntil, now + 30000)
  assert.deepEqual(result.eras, [])
  assert.equal(f.stats.ownerChecks, 2)
  assert.equal(f.stats.authorityReads, 2)
})

test('authorized empty owner remains empty; seed rows never substitute memories', async () => {
  const f = fixture(); f.deps.readMemories = async () => []
  const result = await readLifeMapProjection(uid, f.deps)
  assert.equal(result.state, 'available'); assert.deepEqual(result.events, [])
})

for (const [name, change] of [
  ['missing root owner', f => { f.state.user = undefined }],
  ['foreign root owner', f => { f.state.user.uid = 'other' }],
  ['account fence', f => { f.state.accountFence = true }],
  ['canonical deletion fence', f => { f.state.tombstone.active = true }],
  ['pending operational deletion', f => { f.state.pendingDeletion = true }],
  ['marked owner', f => { f.state.user.markedForDeletion = true }],
  ['missing canonical grant', f => { f.state.grant = undefined }],
  ['foreign canonical grant', f => { f.state.grant.uid = 'other' }],
  ['wrong purpose', f => { f.state.grant.purpose = 'data.export' }],
  ['wrong tier', f => { f.state.grant.consentTier = 'C7' }],
  ['wrong policy', f => { f.state.grant.policyVersion = 'old' }],
  ['withdrawn storage', f => { f.state.grant.status = 'revoked' }],
  ['expired storage', f => { f.state.grant.expiresAt = now }],
  ['malformed storage expiry', f => { f.state.grant.expiresAt = { toMillis() { throw Error('invalid') } } }],
  ['missing receipt', f => { delete f.state.grant.receiptHash }],
  ['missing operational policy', f => { f.state.policy = undefined }],
  ['foreign operational owner', f => { f.state.policy.ownerId = 'other' }],
  ['paused domain', f => { f.state.policy.domains.memory.mode = 'paused' }],
  ['hidden memory domain', f => { f.state.policy.domains.memory.lifeMapVisible = false }],
  ['unconfirmed enforcement', f => { f.state.policy.enforcement.state = 'pending' }],
  ['wrong applied owner', f => { f.state.applied.ownerId = 'other' }],
  ['stale applied revision', f => { f.state.applied.revision = 3 }],
  ['wrong applied job', f => { f.state.applied.sourceJobId = 'other' }],
  ['applied visibility off', f => { f.state.applied.lifeMapVisible = false }],
]) test(`denies ${name} before reading memories`, async () => {
  const f = fixture(); change(f)
  const result = await readLifeMapProjection(uid, f.deps)
  assert.equal(result.state, 'denied'); assert.deepEqual(result.events, [])
  assert.equal(f.stats.memoryReads, 0)
})

for (const [name, change] of [
  ['canonical withdrawal', f => { f.state.grant.status = 'revoked' }],
  ['canonical replacement', f => { f.state.grant.receiptHash = 'b'.repeat(64) }],
  ['visibility withdrawal', f => { f.state.policy.domains.memory.lifeMapVisible = false }],
  ['deletion', f => { f.state.tombstone.active = true }],
]) test(`discards loaded rows after concurrent ${name}`, async () => {
  const f = fixture(), original = f.deps.readMemories
  f.deps.readMemories = async () => { const rows = await original(); change(f); return rows }
  const result = await readLifeMapProjection(uid, f.deps)
  assert.equal(result.state, 'denied'); assert.deepEqual(result.events, [])
})

test('owner revocation after data read rejects the request', async () => {
  const f = fixture(); f.deps.verifyOwner = async () => { if (++f.stats.ownerChecks === 2) throw Error('revoked owner') }
  await assert.rejects(readLifeMapProjection(uid, f.deps), /revoked owner/)
})

test('canonical expiry bounds the browser lease', async () => {
  const f = fixture(); f.state.grant.expiresAt = now + 1000
  assert.equal((await readLifeMapProjection(uid, f.deps)).validUntil, now + 1000)
})

test('projection omits media, identity and provenance fields and excludes unauthorized records', () => {
  const f = fixture()
  const event = projectCanonicalMemory(uid, 'synthetic-memory', { ...f.memory, rawAudioUrl: 'secret', privateMediaUrl: 'secret', replayManifest: { url: 'secret' }, providerSecret: 'secret', tags: ['private'], connectedTo: ['other'] })
  assert.equal(JSON.stringify(event).includes('secret'), false)
  for (const patch of [{ ownerId: 'other' }, { demo: true }, { demo: undefined }, { deleted: true }, { deleted: undefined }, { consentState: 'pending' }, { consentState: 'revoked' }, { privacyLevel: 'hidden' }]) {
    assert.equal(projectCanonicalMemory(uid, 'synthetic-memory', { ...f.memory, ...patch }), null)
  }
  assert.equal(lifeMapAuthorityBinding(uid, f.state, now) !== null, true)
})

test('malformed canonical timestamps are omitted without losing the owner projection', async () => {
  for (const occurredAt of [1e20, -1e20, Number.NaN, 'invalid-date', { toMillis() { throw Error('invalid') } }]) {
    const f = fixture(); f.memory.occurredAt = occurredAt
    const result = await readLifeMapProjection(uid, f.deps)
    assert.equal(result.state, 'available'); assert.equal(result.events.length, 1)
    assert.equal('occurredAt' in result.events[0], false)
  }
})
