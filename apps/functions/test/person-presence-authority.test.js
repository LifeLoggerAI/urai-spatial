const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')
const { createHash } = require('node:crypto')
const authority = require('../lib/apps/functions/src/personPresenceAuthority.js')
const uid = 'synthetic-owner', bundleId = 'synthetic-bundle', sceneId = 'synthetic-scene', sessionId = 'presence:synthetic-session-0001'
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

class Timestamp { constructor(value) { this.value = value } toMillis() { return this.value } static fromMillis(value) { return new Timestamp(value) } }
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
function fixture() {
  const docs = new Map(), prefix = `users/${uid}/`
  const put = (collection, id, value) => docs.set(`${prefix}${collection}/${id}`, structuredClone(value))
  const get = (collection, id) => docs.get(`${prefix}${collection}/${id}`)
  const ref = (location) => ({ path: location, id: location.split('/').at(-1), get: async () => snapshot(location),
    set: async (value, options) => docs.set(location, options?.merge ? { ...docs.get(location), ...value } : value) })
  const snapshot = (location) => ({ id: location.split('/').at(-1), exists: docs.has(location), ref: ref(location),
    get: (key) => docs.get(location)?.[key], data: () => docs.get(location) })
  const db = { doc: ref, getAll: async (...refs) => refs.map((item) => snapshot(item.path)),
    runTransaction: async (operation) => operation({ get: async (item) => snapshot(item.path), getAll: async (...refs) => refs.map((item) => snapshot(item.path)),
      set: (item, value, options) => docs.set(item.path, options?.merge ? { ...docs.get(item.path), ...value } : value) }),
    batch: () => { const writes = []; return { set: (item, value) => writes.push([item.path, value]), commit: async () => { for (const [location, value] of writes) docs.set(location, { ...docs.get(location), ...value }) } } },
    collection: (location) => { let predicate, limit = Infinity, after = ''; const query = {
      where: (field, _operator, value) => { predicate = (data) => data[field]?.includes(value); return query },
      limit: (value) => { limit = value; return query }, startAfter: (doc) => { after = doc.id; return query },
      get: async () => { const rows = [...docs].filter(([key, value]) => key.startsWith(`${location}/`) && !key.slice(location.length + 1).includes('/') && (!predicate || predicate(value)))
        .sort(([a], [b]) => a.localeCompare(b)).filter(([key]) => key.split('/').at(-1) > after).slice(0, limit).map(([key]) => snapshot(key))
        return { docs: rows, empty: rows.length === 0, size: rows.length } }, add: async () => ({}) }; return query } }
  put('privacyPolicy', 'current', { domains: { models: { mode: 'granted', modelContext: true }, identity: { mode: 'granted', likenessEnabled: true } }, enforcement: { state: 'fully-enforced' } })
  put('lifeEntities', 'person', { ownerId: uid, kind: 'person', revoked: false, canonicalLabel: 'Synthetic fixture person', revision: 1 })
  put('lifeEntityStates', 'state', { ownerId: uid, entityId: 'person', asOf: '2020-01-01', knowledgeCutoff: '2020-01-01' })
  put('lifeClaims', 'claim', { ownerId: uid, subjectEntityId: 'person', status: 'accepted', synthetic: false, evidenceClass: 'SOURCE_DERIVED',
    predicate: 'fixture-fact', value: 'synthetic evidence', valueDigest: sha('synthetic evidence'), sourceIds: ['source'], confidence: 'confirmed' })
  put('personModelBundles', bundleId, { ownerId: uid, schemaVersion: 'urai-life-model-v1', state: 'current', synthetic: false, personId: 'person', stateId: 'state',
    asOf: '2020-01-01', knowledgeCutoff: '2020-01-01', acceptedClaimIds: ['claim'], sourceIds: ['source'], dependencyIds: ['claim','person','state','source'], bundleHash: 'b'.repeat(64), negativeConstraints: [] })
  put('lifeGraphSnapshots', 'graph', { ownerId: uid, schemaVersion: 'urai-life-model-v1', state: 'current', syntheticOutputMayBecomeHistoricalSource: false,
    entityIds: ['person'], claimIds: ['claim'], sourceIds: ['source'], dependencyIds: ['claim','person','source'], graphHash: 'c'.repeat(64) })
  put('sceneTruthPackets', sceneId, { ownerId: uid, schemaVersion: 'urai-life-model-v1', state: 'current', syntheticOutputMayBecomeHistoricalSource: false,
    decision: 'READY_WITH_OCCLUSION', graphSnapshotId: 'graph', personModelBundleIds: [bundleId], sourceIds: ['source'], dependencyIds: ['claim','person','source'],
    packetHash: 'd'.repeat(64), unknowns: ['fixture unknown'], forbiddenAssertions: ['never invent fixture history'] })
  async function prepare() {
    const prepared = await authority.preparePersonPresenceAuthority(db, uid, { bundleId, sceneTruthPacketId: sceneId, mode: 'HISTORICAL_AS_OF' })
    put('simulationSessions', sessionId, { ...prepared, ownerId: uid, state: 'active', presentationClass: 'SIMULATED', historicalSourceAuthority: false, syntheticOutputMayBecomeHistoricalSource: false })
    return prepared
  }
  function bindVoice() { put('personRenderBindings', `${bundleId}:voice`, { ownerId: uid, personId: 'person', bundleId, modality: 'voice', provider: 'elevenlabs',
    providerResourceId: 'synthetic-voice', reviewState: 'ACCEPTED', consentState: 'authorized', state: 'current', sourceAuthorityHash: 'b'.repeat(64), bundleHash: 'b'.repeat(64),
    bindingHash: 'e'.repeat(64), dependencyIds: ['claim','person','source'] }) }
  return { db, docs, put, get, prepare, bindVoice }
}

function handler(file, f, fetch) {
  const module = { exports: {} }, filename = path.resolve(__dirname, `../lib/apps/functions/src/${file}.js`)
  const admin = { apps: ['synthetic'], firestore: Object.assign(() => f.db, { Timestamp, FieldValue: { serverTimestamp: () => 'synthetic-timestamp' } }),
    auth: () => ({ verifyIdToken: async () => ({ uid }) }) }
  const region = { https: { HttpsError, onCall: (callback) => callback } }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, require: (name) => {
    if (name === 'firebase-admin') return admin
    if (name === 'firebase-functions/v1') return { region: () => region, https: { HttpsError } }
    if (name === 'firebase-functions/v2/https') return { onRequest: (_options, callback) => callback }
    if (name === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'synthetic-token' }) }
    if (name === './personPresenceAuthority') return authority
    return require(name)
  }, Buffer, process: { env: { PERSON_PRESENCE_ENABLED: 'true', PERSON_PRESENCE_VOICE_ENABLED: 'true' } }, fetch,
  AbortController, URL, TextDecoder, setTimeout, clearTimeout, setInterval, clearInterval, console }, { filename })
  return module.exports
}
function response() {
  const res = new EventEmitter(); res.code = 200; res.headers = {}; res.chunks = []; res.headersSent = false; res.writableEnded = false
  res.status = (code) => { res.code = code; return res }; res.setHeader = (key, value) => { res.headers[key] = value }
  res.write = (chunk) => { res.headersSent = true; res.chunks.push(Buffer.from(chunk)) }
  res.end = (chunk) => { if (chunk) res.write(chunk); res.writableEnded = true }; res.json = (value) => { res.jsonValue = value; res.end(JSON.stringify(value)) }
  return res
}
function request(extra = {}) { return { method: 'POST', headers: { authorization: 'Bearer synthetic' }, body: {
  sessionId, message: 'synthetic question', text: 'synthetic reply', context: [], requestId: 'f'.repeat(64), aiProcessingConsent: true, externalProcessingConsent: true, ...extra } } }
function stream() { const result = { message: 'synthetic reply', caption: 'synthetic reply', evidenceClaimIds: ['claim'], uncertainty: '', simulationLabel: 'Simulation' }
  return new Response(`data: ${JSON.stringify({ type: 'response.output_text.delta', delta: JSON.stringify(result) })}\n\ndata: {"type":"response.completed"}\n\n`, { status: 200 }) }

test('Presence pins selected scene, graph, person state, claim values and cutoff instead of accepting arbitrary current bundles', async () => {
  const f = fixture(), prepared = await f.prepare()
  assert.ok(prepared.dependencyIds.includes('source')); assert.ok(prepared.dependencyIds.includes(sceneId)); assert.equal(prepared.sceneUnknowns.length, 1)
  assert.equal((await authority.loadPersonPresenceAuthority(f.db, uid, sessionId)).authorityDigest, prepared.authorityDigest)
  f.get('sceneTruthPackets', sceneId).personModelBundleIds = ['foreign-bundle']
  await assert.rejects(authority.loadPersonPresenceAuthority(f.db, uid, sessionId), /FOREIGN_SCENE/)
  f.get('sceneTruthPackets', sceneId).personModelBundleIds = [bundleId]
  f.get('lifeClaims', 'claim').value = 'corrected value'; f.get('lifeClaims', 'claim').valueDigest = sha('corrected value')
  await assert.rejects(authority.loadPersonPresenceAuthority(f.db, uid, sessionId), /AUTHORITY_CHANGED/)
  f.get('lifeClaims', 'claim').status = 'superseded'
  await assert.rejects(authority.loadPersonPresenceAuthority(f.db, uid, sessionId), /EVIDENCE_STALE/)
})

test('actual Presence handlers deny stale, revoked and foreign-scene dispatch before any provider request', async () => {
  const mutations = [f => { f.get('personModelBundles', bundleId).bundleHash = 'a'.repeat(64) },
    f => { f.get('lifeEntities', 'person').revoked = true }, f => { f.get('sceneTruthPackets', sceneId).personModelBundleIds = [] }]
  for (const mutate of mutations) {
    const f = fixture(); await f.prepare(); mutate(f); let calls = 0
    const h = handler('personPresenceProvider', f, async () => { calls++; throw new Error('provider must not be contacted') }).personPresenceProvider, res = response()
    await h(request(), res); assert.equal(res.code, 409); assert.equal(calls, 0); assert.equal(res.chunks.length, 1)
  }
})

test('claim correction cannot introduce an unbound source before derivative invalidation completes', async () => {
  const f = fixture()
  f.get('lifeClaims', 'claim').sourceIds = ['new-unbound-source']
  await assert.rejects(f.prepare(), /EVIDENCE_LINEAGE_CHANGED/)
  let calls = 0
  f.get('lifeClaims', 'claim').sourceIds = ['source']
  await f.prepare()
  f.get('lifeClaims', 'claim').sourceIds = ['new-unbound-source']
  const h = handler('personPresenceProvider', f, async () => { calls++; return stream() }).personPresenceProvider
  const res = response()
  await h(request(), res)
  assert.equal(res.code, 409)
  assert.equal(calls, 0)
  assert.equal(Buffer.concat(res.chunks).toString().includes('synthetic reply'), false)
})

test('accepted claims remain direct invalidation dependencies when aggregate metadata is incomplete', async () => {
  const f = fixture()
  for (const [collection, id] of [['personModelBundles', bundleId], ['lifeGraphSnapshots', 'graph'], ['sceneTruthPackets', sceneId]]) {
    f.get(collection, id).dependencyIds = ['person', 'source']
  }
  const prepared = await f.prepare()
  assert.ok(prepared.dependencyIds.includes('claim'))
  await authority.invalidateLifeModelDependencies(f.db, uid, 'claim', 'synthetic-correction', false, 'synthetic-timestamp')
  assert.equal(f.get('simulationSessions', sessionId).state, 'invalidated')
})

test('correction, consent revocation and foreign-scene changes during provider execution suppress all private output', async () => {
  const mutations = [f => { f.get('lifeClaims', 'claim').status = 'superseded' },
    f => { f.get('privacyPolicy', 'current').domains.models.mode = 'denied' },
    f => { f.get('sceneTruthPackets', sceneId).personModelBundleIds = [] }, f => { f.get('lifeGraphSnapshots', 'graph').graphHash = 'a'.repeat(64) }]
  for (const mutate of mutations) {
    const f = fixture(); await f.prepare()
    const h = handler('personPresenceProvider', f, async (url) => {
      if (url.endsWith('/moderations')) return Response.json({ results: [{ flagged: false }] })
      mutate(f); return stream()
    }).personPresenceProvider, res = response()
    await h(request(), res); assert.ok([403, 409].includes(res.code)); assert.ok(res.jsonValue.error)
    assert.equal(Buffer.concat(res.chunks).toString().includes('synthetic reply'), false, 'unvalidated provider deltas must never be delivered')
  }
})

test('valid simulated output retains only opaque authority lineage and cannot become historical testimony', async () => {
  const f = fixture(), prepared = await f.prepare()
  const h = handler('personPresenceProvider', f, async (url) => url.endsWith('/moderations') ? Response.json({ results: [{ flagged: false }] }) : stream()).personPresenceProvider, res = response()
  await h(request(), res); assert.equal(res.code, 200)
  const done = JSON.parse(Buffer.concat(res.chunks).toString().trim().split('\n').at(-1))
  assert.equal(done.authorityDigest, prepared.authorityDigest); assert.equal(done.sceneTruthPacketId, sceneId)
  assert.equal(done.historicalSourceAuthority, false); assert.equal(done.syntheticOutputMayBecomeHistoricalSource, false)
})

test('voice checks source and accepted binding again before delivering any audio bytes', async () => {
  for (const mutation of [f => { f.get('personRenderBindings', `${bundleId}:voice`).state = 'revoked' }, f => { f.get('lifeClaims', 'claim').status = 'superseded' }]) {
    const f = fixture(); await f.prepare(); f.bindVoice()
    const h = handler('personPresenceVoiceProvider', f, async () => { mutation(f); return new Response('synthetic-audio', { headers: { 'content-type': 'audio/mpeg' } }) }).personPresenceVoiceProvider, res = response()
    await h(request(), res); assert.equal(res.code, 409); assert.equal(Buffer.concat(res.chunks).toString().includes('synthetic-audio'), false)
  }
  const f = fixture(); await f.prepare(); f.bindVoice()
  const h = handler('personPresenceVoiceProvider', f, async () => new Response('synthetic-audio', { headers: { 'content-type': 'audio/mpeg' } })).personPresenceVoiceProvider, res = response()
  await h(request(), res); assert.equal(res.code, 200); assert.equal(Buffer.concat(res.chunks).toString(), 'synthetic-audio')
})

test('session/capability handlers carry canonical dependency lineage and deny corrected bundles', async () => {
  const f = fixture(), h = handler('personPresenceFunctions', f, async () => { throw new Error('no provider') }), context = { auth: { uid } }
  const session = await h.preparePersonPresenceSession({ bundleId, sceneTruthPacketId: sceneId, mode: 'HISTORICAL_AS_OF', interactivePresenceConsent: true }, context)
  const state = f.get('simulationSessions', session.sessionId)
  assert.equal(state.sceneTruthPacketId, sceneId); assert.ok(state.dependencyIds.includes('claim')); assert.equal(state.graphHash, 'c'.repeat(64))
  f.get('personModelBundles', bundleId).state = 'invalidated'
  await assert.rejects(h.getPersonPresenceCapabilities({ sessionId: session.sessionId }, context), /PERSON_MODEL_STALE/)
})

test('dependency correction/revocation reaches sessions and render bindings beyond the old 100-document truncation', async () => {
  const f = fixture(); await f.prepare(); f.bindVoice()
  for (let i = 0; i < 205; i++) f.put('simulationSessions', `session-${String(i).padStart(4, '0')}`, { ownerId: uid, state: 'active', dependencyIds: ['claim'] })
  const count = await authority.invalidateLifeModelDependencies(f.db, uid, 'claim', 'synthetic-correction', false, 'synthetic-timestamp')
  assert.ok(count > 205); assert.equal(f.get('simulationSessions', 'session-0204').state, 'invalidated'); assert.equal(f.get('personRenderBindings', `${bundleId}:voice`).state, 'invalidated')
  await authority.invalidateLifeModelDependencies(f.db, uid, 'source', 'synthetic-revoke', true, 'synthetic-timestamp')
  assert.equal(f.get('simulationSessions', sessionId).state, 'revoked'); assert.equal(f.get('personRenderBindings', `${bundleId}:voice`).state, 'revoked')
  const g = fixture(); await g.prepare(); g.bindVoice()
  for (let i = 0; i < 505; i++) g.put('simulationSessions', `session-${String(i).padStart(4, '0')}`, { ownerId: uid, state: 'active', dependencyIds: [] })
  await authority.revokePersonPresenceConsentDerivatives(g.db, uid, 'synthetic-consent-revoke', 'synthetic-timestamp')
  assert.equal(g.get('simulationSessions', 'session-0504').state, 'revoked', 'consent revocation cannot silently truncate the session set at 500')
})
