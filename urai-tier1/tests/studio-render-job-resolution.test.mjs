import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { resolveStudioRenderJob } from '../src/spatial/replay/resolveStudioRenderJob.ts'

const digest = 'a'.repeat(64)
const receipt = 'b'.repeat(64)
const jobId = '01JP0SYNTHETICJOB0000000000'
const selection = { memoryId: 'memory-alpha', manifestId: 'manifest-alpha' }

function fixture() {
  const state = {
    session: { uid: 'owner-alpha', tenantId: 'studio-one' },
    memory: { id: 'memory-alpha', ownerId: 'owner-alpha', demo: false, deleted: false,
      replayManifest: { id: 'manifest-alpha', version: 3 } },
    admission: { ownerUid: 'owner-alpha', memoryId: 'memory-alpha', consentState: 'allowed', deletionFenced: false },
    binding: { sourceSystem: 'urai-jobs', ownerUid: 'owner-alpha', tenantId: 'studio-one',
      memoryId: 'memory-alpha', manifestId: 'manifest-alpha', manifestVersion: 3, jobId,
      renderPlanDigest: digest, decisionReceiptId: receipt },
    grant: { issuer: 'urai-privacy', ownerUid: 'owner-alpha', tenantId: 'studio-one',
      purpose: 'life-movie.render', policyVersion: '1.1.0', decisionReceiptId: receipt,
      status: 'granted', revoked: false },
    job: { jobId, sourceSystem: 'urai-studio', ownerUid: 'owner-alpha', tenantId: 'studio-one',
      jobType: 'studio.render.video', status: 'SUCCESS', renderPlanDigest: digest,
      outputDeleted: false,
      consent: { purpose: 'life-movie.render', policyVersion: '1.1.0', decisionReceiptId: receipt } },
  }
  const calls = []
  const readers = {
    async currentVerifiedTenantSession() { calls.push('session'); return state.session },
    async readOwnerMemory(uid, id) { calls.push(['memory', uid, id]); return state.memory },
    async readCurrentMemoryAdmission(uid, id) { calls.push(['admission', uid, id]); return state.admission },
    async readCanonicalRenderBinding(uid, id, manifestId) { calls.push(['binding', uid, id, manifestId]); return state.binding },
    async readCurrentCanonicalRenderGrant(uid, tenant, id) { calls.push(['grant', uid, tenant, id]); return state.grant },
    async readBoundJobsRender(tenant, uid, id) { calls.push(['job', tenant, uid, id]); return state.job },
  }
  return { state, calls, readers }
}

const unavailable = { status: 'unavailable' }

test('synthetic server-side fixture only: matched reference is NOT media authorization', async () => {
  const { readers, calls } = fixture()
  assert.deepEqual(await resolveStudioRenderJob(selection, readers), {
    status: 'reference-only', jobId, memoryId: selection.memoryId, manifestId: selection.manifestId,
  })
  assert.equal(calls.filter(c => c === 'session').length, 2)
  assert.equal(calls.filter(c => Array.isArray(c) && c[0] === 'grant').length, 2)
})

for (const [label, candidate] of [
  ['empty input', null],
  ['missing manifest', { memoryId: 'memory-alpha' }],
  ['client-supplied job ID', { ...selection, jobId }],
  ['client-supplied tenant', { ...selection, tenantId: 'studio-one' }],
  ['path traversal', { ...selection, memoryId: '../other' }],
  ['demo memory request', { ...selection, memoryId: 'demo:quiet-reset' }],
  ['malformed manifest', { ...selection, manifestId: '' }],
]) {
  test(`preflight deny: ${label} without touching owner data`, async () => {
    const { readers, calls } = fixture()
    assert.deepEqual(await resolveStudioRenderJob(candidate, readers), unavailable)
    assert.deepEqual(calls, [])
  })
}

for (const [label, change] of [
  ['anonymous', s => { s.session = null }],
  ['missing trusted Studio tenant', s => { s.session.tenantId = '' }],
  ['cross-owner memory', s => { s.memory.ownerId = 'other' }],
  ['cross-memory document', s => { s.memory.id = 'other' }],
  ['demo fixture', s => { s.memory.demo = true }],
  ['deleted memory', s => { s.memory.deleted = true }],
  ['wrong manifest', s => { s.memory.replayManifest.id = 'other' }],
  ['revoked memory consent', s => { s.admission.consentState = 'denied' }],
  ['pending memory consent', s => { s.admission.consentState = 'pending' }],
  ['owner deletion fence', s => { s.admission.deletionFenced = true }],
  ['cross-owner admission', s => { s.admission.ownerUid = 'other' }],
  ['missing immutable binding', s => { s.binding = null }],
  ['untrusted binding source', s => { s.binding.sourceSystem = 'client' }],
  ['foreign owner binding', s => { s.binding.ownerUid = 'other' }],
  ['foreign tenant binding', s => { s.binding.tenantId = 'studio-other' }],
  ['wrong memory binding', s => { s.binding.memoryId = 'other' }],
  ['wrong manifest binding', s => { s.binding.manifestId = 'other' }],
  ['stale manifest version', s => { s.binding.manifestVersion = 2 }],
  ['invalid job ref', s => { s.binding.jobId = '../evil' }],
  ['missing plan digest', s => { s.binding.renderPlanDigest = '' }],
  ['invalid consent receipt', s => { s.binding.decisionReceiptId = 'fabricated' }],
  ['missing canonical render issuer', s => { s.grant = null }],
  ['incorrect issuer', s => { s.grant.issuer = 'client' }],
  ['unapproved purpose', s => { s.grant.purpose = 'memory.storage' }],
  ['wrong policy version', s => { s.grant.policyVersion = '1.0.0' }],
  ['foreign grant owner', s => { s.grant.ownerUid = 'other' }],
  ['foreign grant tenant', s => { s.grant.tenantId = 'other' }],
  ['wrong grant receipt', s => { s.grant.decisionReceiptId = digest }],
  ['pending render decision', s => { s.grant.status = 'pending' }],
  ['revoked render grant', s => { s.grant.revoked = true }],
  ['missing Jobs record', s => { s.job = null }],
  ['cross-owner Jobs job', s => { s.job.ownerUid = 'other' }],
  ['cross-tenant Jobs job', s => { s.job.tenantId = 'other' }],
  ['wrong Jobs source', s => { s.job.sourceSystem = 'another' }],
  ['wrong Jobs type', s => { s.job.jobType = 'another' }],
  ['Jobs pending', s => { s.job.status = 'PENDING' }],
  ['Jobs deleted output', s => { s.job.outputDeleted = true }],
  ['Jobs changed render plan', s => { s.job.renderPlanDigest = receipt }],
  ['Jobs wrong consent purpose', s => { s.job.consent.purpose = 'memory.storage' }],
  ['Jobs wrong decision receipt', s => { s.job.consent.decisionReceiptId = digest }],
]) {
  test(`deny: ${label}`, async () => {
    const { state, readers } = fixture()
    change(state)
    assert.deepEqual(await resolveStudioRenderJob(selection, readers), unavailable)
  })
}

test('deny session tenant switch after the Jobs read', async () => {
  const { readers } = fixture()
  let n = 0
  readers.currentVerifiedTenantSession = async () => ++n === 1
    ? { uid: 'owner-alpha', tenantId: 'studio-one' }
    : { uid: 'owner-alpha', tenantId: 'studio-two' }
  assert.deepEqual(await resolveStudioRenderJob(selection, readers), unavailable)
})

test('deny consent revoked during asynchronous read', async () => {
  const { readers } = fixture()
  let n = 0
  const original = readers.readCurrentMemoryAdmission
  readers.readCurrentMemoryAdmission = async (...args) => {
    const v = await original(...args)
    return ++n === 1 ? v : { ...v, consentState: 'denied' }
  }
  assert.deepEqual(await resolveStudioRenderJob(selection, readers), unavailable)
})

test('deny render grant revoked during asynchronous read', async () => {
  const { readers } = fixture()
  let n = 0
  const original = readers.readCurrentCanonicalRenderGrant
  readers.readCurrentCanonicalRenderGrant = async (...args) => {
    const v = await original(...args)
    return ++n === 1 ? v : { ...v, revoked: true }
  }
  assert.deepEqual(await resolveStudioRenderJob(selection, readers), unavailable)
})

test('backend errors fail closed without leaking raw details', async () => {
  const { readers } = fixture()
  readers.readBoundJobsRender = async () => { throw new Error('secret object path gs://private') }
  assert.deepEqual(await resolveStudioRenderJob(selection, readers), unavailable)
})

test('no HTTP route, credential, media signing or private write introduced', () => {
  const source = readFileSync(new URL('../src/spatial/replay/resolveStudioRenderJob.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /getSignedUrl\(|getStorage\(|fetch\(|onRequest\(|onCall\(|\.set\(|\.update\(|\.delete\(/)
  assert.doesNotMatch(source, /URAI_STUDIO_JOBS_DISPATCH_ENABLED|URAI_STUDIO_JOBS_BRIDGE_TOKEN/)
})
