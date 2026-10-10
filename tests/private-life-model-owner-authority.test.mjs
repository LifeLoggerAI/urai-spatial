import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import crypto from 'node:crypto'
import test from 'node:test'

const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}' : JSON.stringify(value)
const copy = value => value === undefined ? undefined : structuredClone(value)
const source = readFileSync(process.env.OWNER_REVIEW_TEST_SOURCE || new URL('../apps/functions/src/privateLifeModelReview.ts', import.meta.url), 'utf8')
const policyAuthority = stripTypeScriptTypes(readFileSync(new URL('../apps/functions/src/consentPolicyAuthority.ts', import.meta.url), 'utf8').replace(/^export /gm, ''))
const producer = readFileSync(new URL('./fixtures/private-life-model-producer-5da7829.ts', import.meta.url), 'utf8')

function database() {
  const records = new Map(), versions = new Map()
  let beforeCommit, retries = 0, serial = 0
  const put = (path, value) => { records.set(path, copy(value)); versions.set(path, (versions.get(path) || 0) + 1) }
  const ref = path => ({ path, collection: name => collection(path + '/' + name) })
  const collection = path => ({ doc: id => ref(path + '/' + (id || 'audit-' + ++serial)) })
  const db = { collection, doc: ref, async runTransaction(callback) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const reads = new Map(), writes = []
      const tx = { async get(r) {
        assert.equal(writes.length, 0, 'Firestore reads must precede writes')
        const value = copy(records.get(r.path)); reads.set(r.path, versions.get(r.path) || 0)
        return { exists: value !== undefined, data: () => value, get: key => value?.[key] }
      }, create(r, value) { writes.push({ r, value, create: true }) }, set(r, value, options) { writes.push({ r, value, options }) } }
      const result = await callback(tx)
      if (beforeCommit) { const hook = beforeCommit; beforeCommit = undefined; hook() }
      if ([...reads].some(([path, version]) => version !== (versions.get(path) || 0))) { retries++; continue }
      for (const write of writes) if (write.create && records.has(write.r.path)) throw new Error('already exists')
      for (const write of writes) put(write.r.path, write.options?.merge ? { ...records.get(write.r.path), ...write.value } : write.value)
      return result
    }
    throw new Error('transaction conflict')
  } }
  return { db, records, put, conflict: hook => { beforeCommit = hook }, retries: () => retries }
}

async function fixture() {
  const d = database(), uid = 'owner-a', sourceReceiptRef = 'psr_abcdefghijklmnop', sourceHandle = 'psh_abcdefghijklmnop'
  const request = { ownerUid: uid, jobId: 'job-review-0001', leaseToken: 'lease-token-0001', sourceReceiptRef, sourceHandle,
    sourceEvidenceClass: 'SOURCE_CAPTURED', requestedPurpose: 'memory-index', transcriptRef: 'private:transcripts/current',
    provenanceRef: 'private:provenance/current', correlationTrigger: 'initial-source', idempotencyKey: 'job-review-0001' }
  const resolved = { sourceFixityRef: 'private:fixity/current', sourceSha256: sha('source'), sourceByteLength: 42, sourceRevision: 1,
    transcriptSha256: sha('transcript'), provenanceSha256: sha('provenance'), transcriptByteLength: 28 }
  const consent = { purpose: 'memory.storage', policyVersion: 'policy-v1', decisionReceiptId: 'consent-1' }
  const sourcePath = 'uraiPrivateSourceReceipts/' + sha(sourceReceiptRef)
  const transcriptPath = sourcePath + '/transcripts/' + sha(request.transcriptRef)
  const blockPath = 'jobConsentBlocks/' + sha(uid + '\n' + 'memory.storage')
  const fencePath = 'uraiPrivateLifeModelOwnerFences/' + sha(uid)
  const policyPath = `users/${uid}/privacyPolicy/current`
  d.put('jobs/' + request.jobId, { ownerUid: uid, type: 'memory.private-source.index', status: 'RUNNING', execution: { leaseToken: request.leaseToken }, payload: request, consent })
  d.put(sourcePath, { schemaVersion: 'urai-private-source-receipt-v2', ownerUid: uid, sourceReceiptRef, sourceHandle,
    status: 'ACTIVE', synthetic: false, sourceEvidenceClass: request.sourceEvidenceClass, purposes: ['memory-index'], consent, ...resolved })
  d.put(transcriptPath, { schemaVersion: 'urai-private-source-transcript-v2', ownerUid: uid, sourceReceiptRef,
    status: 'CURRENT', synthetic: false, requestedPurpose: 'memory-index', transcriptRef: request.transcriptRef, provenanceRef: request.provenanceRef, ...resolved })
  const domain = mode => ({ mode, retentionDays: null, precise: false, replayVisible: false, lifeMapVisible: false, modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false })
  d.put(policyPath, { version: 2, revision: 1, ownerId: uid,
    domains: { memory: domain('granted'), location: domain('denied'), models: { ...domain('granted'), modelContext: true }, exports: domain('denied'), workforce: domain('denied'), identity: domain('granted') },
    enforcement: { state: 'fully-enforced', jobId: 'fixture-enforcement', affectedTargets: [], providerState: 'complete' } })
  const fieldValue = { serverTimestamp: () => 'test-time' }
  const producerCode = stripTypeScriptTypes(producer)
  const context = vm.createContext({ crypto, firestore: () => d.db, FieldValue: fieldValue, Buffer, process: { env: {
    URAI_SOURCE_SHA: '5da7829568496685e180a77e4ba6c8489c8cb251', K_REVISION: 'test', URAI_LIFE_MODEL_EXTRACTOR_MODEL: 'synthetic', URAI_PRIVATE_LIFE_MODEL_EXECUTION_AUTHORITY_REF: 'test' } } })
  vm.runInContext(producerCode + '; globalThis.produce = persistRevision; globalThis.bind = binding;', context)
  const handleHash = sha(uid + '\n' + sourceHandle).slice(0,40), root = 'uraiPrivateLifeModel/' + handleHash
  d.put(root + '/idempotency/' + sha(request.idempotencyKey), { ownerUid: uid, requestDigest: sha(canonical(context.bind(request,resolved))), state: 'STARTED', reservation: 'reservation-1' })
  const extraction = { entities: [{ entityId: 'event-1', type: 'event', label: 'Remembered event' }],
    claims: [{ claimId: 'claim-1', subject: 'event-1', predicate: 'description', object: 'Owner source assertion', evidenceClass: 'SOURCE_CAPTURED', confidence: 0.8 }],
    relationships: [], temporalStates: [], places: [], conflicts: [], negativeConstraints: [], sceneTruth: { decision: 'BLOCKED', reasons: ['REVIEW'] } }
  const produced = await context.produce(request, extraction, resolved, 'reservation-1')
  const revisionPath = root + '/revisions/00000001', currentPath = root + '/state/current'
  const candidate = d.records.get(revisionPath).importCandidate
  const input = { ...produced, reviewId: 'review-1', entities: candidate.entities.map(e => e.id),
    claims: candidate.claims.map(c => ({ id: c.id, evidenceClass: 'SOURCE_CAPTURED', confidence: 'confirmed' })), relationships: [] }
  const firestore = () => d.db; firestore.FieldValue = fieldValue
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  const callableCode = stripTypeScriptTypes(source.replace(/^import .*\n/gm, '').replace('export const reviewPrivateLifeModelCandidate', 'const reviewPrivateLifeModelCandidate'))
  const callableContext = vm.createContext({ admin: { apps: [{}], firestore }, functions: { region: () => ({ https: { onCall: fn => fn } }), https: { HttpsError } }, createHash: crypto.createHash, Buffer })
  vm.runInContext(policyAuthority, callableContext)
  vm.runInContext(callableCode + '; globalThis.review = reviewPrivateLifeModelCandidate;', callableContext)
  const review = () => callableContext.review(input, { auth: { uid } })
  const amend = (path, change) => d.put(path, { ...d.records.get(path), ...change })
  const canonicalPaths = () => [...d.records.keys()].filter(p => /\/life(Entities|Claims|CausalEdges|ModelReceipts)\//.test(p))
  return { ...d, uid, input, sourcePath, transcriptPath, blockPath, fencePath, policyPath, revisionPath, currentPath, review, amend, canonicalPaths }
}

test('actual Jobs persistence output promotes and replays without duplicate writes after worker completion', async () => {
  const f = await fixture(); f.amend('jobs/job-review-0001', { status: 'SUCCEEDED', execution: {} })
  const first = await f.review(); assert.equal(first.replayed, false); assert.equal(first.claimCount, 1)
  const count = f.canonicalPaths().length
  assert.equal((await f.review()).replayed, true); assert.equal(f.canonicalPaths().length, count)
})

const mutations = {
  'source revocation': f => f.amend(f.sourcePath, { status: 'REVOKED' }),
  'source correction': f => f.amend(f.sourcePath, { sourceRevision: 2 }),
  'transcript correction': f => f.amend(f.transcriptPath, { transcriptSha256: sha('corrected') }),
  'source owner substitution': f => f.amend(f.sourcePath, { ownerUid: 'other-owner' }),
  'transcript owner substitution': f => f.amend(f.transcriptPath, { ownerUid: 'other-owner' }),
  'source handle substitution': f => f.amend(f.sourcePath, { sourceHandle: 'psh_qrstuvwxyzabcdef' }),
  'consent withdrawal': f => f.put(f.blockPath, { active: true }),
  'owner deletion': f => f.put(f.fencePath, { deleted: true }),
  'model policy withdrawal': f => f.amend(f.policyPath, { domains: {} }),
  'consent receipt substitution': f => f.amend(f.sourcePath, { consent: { purpose: 'memory.storage', policyVersion: 'policy-v1', decisionReceiptId: 'other' } }),
  'job payload substitution': f => f.amend('jobs/job-review-0001', { payload: { requestedPurpose: 'memory-index' } }),
}
for (const [name, mutate] of Object.entries(mutations)) {
  test(name + ' blocks promotion without writes', async () => {
    const f = await fixture(); mutate(f); await assert.rejects(f.review()); assert.equal(f.canonicalPaths().length, 0)
  })
  test(name + ' blocks stale receipt replay', async () => {
    const f = await fixture(); await f.review(); const count = f.canonicalPaths().length
    mutate(f); await assert.rejects(f.review()); assert.equal(f.canonicalPaths().length, count)
  })
}

test('revocation between reads and commit forces retry and denies all staged writes', async () => {
  const f = await fixture(); f.conflict(() => f.amend(f.sourcePath, { status: 'REVOKED' }))
  await assert.rejects(f.review()); assert.equal(f.retries(), 1); assert.equal(f.canonicalPaths().length, 0)
})
test('candidate source substitution with recomputed retained checksum is denied', async () => {
  const f = await fixture(), record = copy(f.records.get(f.revisionPath))
  record.importCandidate.entities[0].createdFromSourceIds = ['psr_qrstuvwxyzabcdef']
  const { checksum, backlogState, createdAt, ...retained } = record
  record.checksum = sha(canonical(retained)); f.put(f.revisionPath, record)
  f.amend(f.currentPath, { checksum: record.checksum }); f.input.checksum = record.checksum
  await assert.rejects(f.review(), /SOURCE_SUBSTITUTION/); assert.equal(f.canonicalPaths().length, 0)
})

