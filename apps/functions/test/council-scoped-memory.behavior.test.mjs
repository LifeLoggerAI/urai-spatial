import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createHash } from 'node:crypto'
import ts from 'typescript'

// Exercises the actual checked-out TypeScript production resolver and reader,
// not textual assertions. Firestore/source receipts are controlled test doubles.
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const uid = 'fictional-owner'
const sourceA = 'psr_lake_alpha', sourceB = 'psr_lake_beta'
const base = 'users/' + uid + '/'
function load(file, imports, globals = {}) {
  const source = fs.readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(js, { module, exports: module.exports, Buffer, URL, AbortController, setTimeout, clearTimeout, ...globals, require(name) {
    assert.ok(Object.hasOwn(imports, name), 'Unexpected production dependency: ' + name)
    return imports[name]
  } }, { filename: file })
  return module.exports
}
const consent = load('consentPolicyAuthority.ts', {})
class HttpsError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const failure = message => { throw new HttpsError('failed-precondition', message) }
function makeFixture() {
  const docs = new Map(), receipts = new Map([
    [sourceA, { active: true, owner: uid, revision: 1 }],
    [sourceB, { active: true, owner: uid, revision: 1 }],
  ])
  const put = (path, value) => docs.set(base + path, structuredClone(value))
  const read = path => docs.get(base + path)
  const snapshot = path => {
    const data = docs.get(path)
    return { exists: data !== undefined, id: path.split('/').at(-1),
      ref: { path, parent: { id: path.split('/').at(-2) } },
      data: () => data, get: key => data?.[key] }
  }
  const db = { doc: path => ({ path, get: async () => snapshot(path), set: async value => docs.set(path, value) }), async runTransaction(callback) {
    const tx = { get: async ref => snapshot(ref.path),
      getAll: async (...refs) => refs.map(ref => snapshot(ref.path)), set: (ref, value) => docs.set(ref.path, value) }
    return callback(tx)
  } }
  const life = {
    async requireLifeItemSources(_db, _tx, owner, item, field) {
      assert.equal(owner, uid)
      const ids = item[field]
      if (!Array.isArray(ids) || !ids.length) failure('SOURCE_REQUIRED')
      return ids.map(id => {
        const receipt = receipts.get(id)
        if (!receipt?.active || receipt.owner !== uid) failure('SOURCE_REVOKED')
        return { id, revision: receipt.revision }
      })
    },
    lifeAuthorityDigest: digest,
    lifeItemDigest: item => digest(item.data()),
  }
  const authority = load('councilGraphEvidenceAuthority.ts', {
    'node:crypto': { createHash },
    'firebase-functions/v1': { https: { HttpsError } },
    './consentPolicyAuthority': consent,
    './lifeGraphAuthority': life,
  })
  put('privacyPolicy/current', {
    version: 2, revision: 1, ownerId: uid,
    domains: Object.fromEntries(
      ['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(name => [name, {
        mode: ['memory', 'models', 'identity'].includes(name) ? 'granted' : 'denied',
        retentionDays: null, precise: false, replayVisible: false, lifeMapVisible: false,
        modelContext: name === 'models', sharingEnabled: false,
        automationEnabled: false, likenessEnabled: false,
      }])
    ),
    enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [],
      providerState: 'not-applicable' },
  })
  put('lifeEntities/person-one', {
    ownerId: uid, kind: 'person', canonicalLabel: 'Fictional Person',
    createdFromSourceIds: [sourceA, sourceB], revoked: false, synthetic: false,
  })
  put('lifeClaims/claim-alpha', {
    ownerId: uid, subjectEntityId: 'person-one', predicate: 'visited',
    value: 'Lake Alpha in 1988', status: 'accepted', synthetic: false,
    confidence: 'confirmed', evidenceClass: 'SOURCE_CAPTURED', sourceIds: [sourceA],
  })
  put('lifeClaims/claim-beta', {
    ownerId: uid, subjectEntityId: 'person-one', predicate: 'visited',
    value: 'Lake Beta in 1996', status: 'accepted', synthetic: false,
    confidence: 'confirmed', evidenceClass: 'SOURCE_CAPTURED', sourceIds: [sourceB],
  })
  put('lifeCausalEdges/edge-beta', {
    ownerId: uid, fromEntityId: 'person-one', toEntityId: 'person-one',
    kind: 'RELATED_TO', status: 'accepted', synthetic: false, sourceIds: [sourceB],
  })
  const graphBody = {
    ownerId: uid, state: 'current', schemaVersion: 'urai-life-model-v1',
    syntheticOutputMayBecomeHistoricalSource: false,
    entityIds: ['person-one'], claimIds: ['claim-alpha', 'claim-beta'],
    edgeIds: ['edge-beta'], sourceIds: [sourceA, sourceB], authorityBindings: {},
  }
  for (const p of ['lifeEntities/person-one', 'lifeClaims/claim-alpha', 'lifeClaims/claim-beta', 'lifeCausalEdges/edge-beta']) {
    const s = snapshot(base + p)
    const field = p.startsWith('lifeEntities') ? 'createdFromSourceIds' : 'sourceIds'
    graphBody.authorityBindings[base + p] = {
      itemDigest: life.lifeItemDigest(s),
      sourceBindingDigest: life.lifeAuthorityDigest(s.get(field).map(id => ({ id, revision: 1 }))),
    }
  }
  const graphHash = digest(graphBody)
  put('lifeGraphSnapshots/graph-shared', { ...graphBody, graphHash })
  for (const [letter, source, claim] of [
    ['a', sourceA, 'claim-alpha'], ['b', sourceB, 'claim-beta'],
  ]) {
    put('memories/memory-' + letter, {
      ownerId: uid, title: 'Synthetic test memory ' + letter,
      deleted: false, demo: false, synthetic: false, consentState: 'granted',
      lifeMovie: { sceneTruthPacketId: 'scene-' + letter,
        provenance: { sourceIds: [source] } },
    })
    const body = {
      ownerId: uid, schemaVersion: 'urai-life-model-v1', state: 'current',
      syntheticOutputMayBecomeHistoricalSource: false, decision: 'READY',
      memoryId: 'memory-' + letter, memorySourceIds: [source],
      memorySourceBindingDigest: digest([{ id: source, revision: 1 }]),
      graphSnapshotId: 'graph-shared', graphHash,
      knownClaimIds: [claim], personModelBundleIds: [], sourceIds: [source],
    }
    put('sceneTruthPackets/scene-' + letter, { ...body, packetHash: digest(body) })
  }
  return { authority, db, receipts, put, read }
}
test('real resolver isolates two source-backed memories sharing one person', async () => {
  const f = makeFixture()
  const a = await f.authority.resolveCouncilMemoryGraph(f.db, uid, 'memory-a')
  const b = await f.authority.resolveCouncilMemoryGraph(f.db, uid, 'memory-b')
  assert.deepEqual(Array.from(a.evidence.claims, c => c.id), ['claim-alpha'])
  assert.deepEqual(Array.from(b.evidence.claims, c => c.id), ['claim-beta'])
  assert.deepEqual(Array.from(a.evidence.edges), [])
  assert.deepEqual(Array.from(a.evidence.entities, e => Object.keys(e).sort()), [['id', 'kind']])
  assert.deepEqual(Array.from(b.evidence.entities, e => Object.keys(e).sort()), [['id', 'kind']])
  assert.equal(a.evidence.entities[0].id, 'person-one')
  assert.deepEqual(Array.from(b.evidence.edges), [])
  assert.doesNotMatch(JSON.stringify(a.evidence), /Lake Beta|claim-beta|edge-beta/)
  assert.doesNotMatch(JSON.stringify(b.evidence), /Lake Alpha|claim-alpha|edge-beta/)
})
test('cross-memory claim lineage fails closed rather than emitting partial evidence', () => {
  const f = makeFixture()
  const mixed = { claims: [
    { id: 'claim-alpha', sourceIds: [sourceA, sourceB] },
    { id: 'claim-beta', sourceIds: [sourceB] },
  ], edges: [{ id: 'edge-beta' }] }
  assert.throws(() => f.authority.scopeCouncilMemoryEvidence(mixed, {
    knownClaimIds: ['claim-alpha'], memorySourceIds: [sourceA],
  }), /COUNCIL_MEMORY_CLAIM_LINEAGE_MISMATCH/)
  assert.throws(() => f.authority.scopeCouncilMemoryEvidence(mixed, {
    knownClaimIds: ['claim-unverified'], memorySourceIds: [sourceA],
  }), /COUNCIL_MEMORY_CLAIM_LINEAGE_MISMATCH/)
})
test('real memory resolver denies wrong scene, foreign owner, demo, deletion and changed source', async () => {
  const mutations = [
    f => f.put('memories/memory-a', { ...f.read('memories/memory-a'), ownerId: 'foreign' }),
    f => f.put('memories/memory-a', { ...f.read('memories/memory-a'), demo: true }),
    f => f.put('memories/memory-a', { ...f.read('memories/memory-a'), deleted: true }),
    f => f.put('sceneTruthPackets/scene-a', { ...f.read('sceneTruthPackets/scene-a'), memoryId: 'memory-b' }),
    f => f.put('lifeGraphSnapshots/graph-shared', { ...f.read('lifeGraphSnapshots/graph-shared'), graphHash: 'corrupt' }),
    f => f.receipts.set(sourceA, { active: false, owner: uid, revision: 1 }),
  ]
  for (const mutate of mutations) {
    const f = makeFixture()
    mutate(f)
    await assert.rejects(f.authority.resolveCouncilMemoryGraph(f.db, uid, 'memory-a'))
  }
})
test('real resolver rejects revoked model-context consent', async () => {
  const f = makeFixture()
  const p = f.read('privacyPolicy/current')
  p.domains.models.mode = 'denied'
  f.put('privacyPolicy/current', p)
  await assert.rejects(f.authority.resolveCouncilMemoryGraph(f.db, uid, 'memory-a'))
})


// Full local trust-path integration: both the real SceneTruth/Life Graph
// resolver and the production HTTP handler execute in one test. Only the
// persisted database, receipt service, and paid-provider transport are mocked.
function integratedCouncilHarness() {
  const f = makeFixture()
  f.put('providerConnections/xai', { processingAllowed: true, revocationState: 'not-required' })
  const sent = []
  let actor = uid
  const firestore = () => f.db
  class Timestamp {
    constructor(ms) { this.ms = ms }
    toMillis() { return this.ms }
    static fromMillis(ms) { return new Timestamp(ms) }
  }
  firestore.Timestamp = Timestamp
  firestore.FieldValue = {
    serverTimestamp: () => 'test-timestamp',
    increment: n => ({ increment: n }),
  }
  const admin = {
    apps: [{}], initializeApp() {},
    firestore,
    auth: () => ({ async verifyIdToken(token, checkRevocation) {
      assert.equal(token, 'fictional-test-token')
      assert.equal(checkRevocation, true)
      return { uid: actor }
    } }),
  }
  const env = { URAI_COUNCIL_XAI_ENABLED: 'true', COUNCIL_XAI_MODEL: 'fictional-transport' }
  const provider = load('councilProviderFunctions.ts', {
    'node:crypto': { createHash },
    './consentPolicyAuthority': consent,
    './councilGraphEvidenceAuthority': f.authority,
    'firebase-admin': admin,
    'firebase-functions/params': { defineSecret: () => ({ value: () => 'fake-not-a-secret' }) },
    'firebase-functions/v2/https': { onRequest: (_opts, handler) => handler },
    './protectedProviderSpend': {
      SPATIAL_SPEND_WORKER_TOKENS_JSON: {},
      SpatialSpendError: class extends Error {},
      assertSpatialPaidOutputCurrent() {},
      async paidSpatialFetch(_db, who, lane, family, model, sourceInput, endpoint, init) {
        assert.equal(who, uid)
        assert.equal(lane, 'council-xai')
        assert.equal(family, 'xai')
        assert.equal(model, 'fictional-transport')
        sent.push({ body: String(init.body), sourceInput, endpoint: String(endpoint) })
        return {
          ok: true, status: 200, headers: { get: () => 'fictional-request-id' },
          async json() { return { choices: [{ message: { content: 'Answer from fictional evidence only.' } }] } },
        }
      },
    },
  }, { process: { env } })
  const invoke = async (memorySelection, patch = {}) => {
    const response = {
      statusCode: 0, body: null, writableEnded: false, headersSent: false, headers: {},
      on() {}, status(code) { this.statusCode = code; return this },
      setHeader(name, value) { this.headers[name] = value },
      json(value) { this.body = value; this.headersSent = true; this.writableEnded = true; return this },
      end() { this.writableEnded = true },
    }
    await provider.xaiCouncilProvider({
      method: 'POST', headers: { authorization: 'Bearer fictional-test-token' },
      body: {
        requestId: 'a'.repeat(64), message: 'What lake was visited?',
        memorySelection, graphShareConsent: true, aiProcessingConsent: true,
        context: [{ role: 'user', content: 'Unrelated previous discussion: OTHER_MEMORY_CONTEXT' }],
        ...patch,
      },
    }, response)
    return response
  }
  return { ...f, sent, invoke, changeActor: value => { actor = value } }
}

test('integrated real resolver and provider handler isolate both memories in serialized xAI request', async () => {
  const f = integratedCouncilHarness()
  for (const [selected, allowed, forbidden] of [
    ['memory-a', 'Lake Alpha in 1988', 'Lake Beta in 1996'],
    ['memory-b', 'Lake Beta in 1996', 'Lake Alpha in 1988'],
  ]) {
    const result = await f.invoke(selected)
    assert.equal(result.statusCode, 200, result.body?.error)
    assert.equal(result.body.provider, 'xai')
    const sent = f.sent.at(-1).body
    assert.match(sent, new RegExp(allowed))
    assert.doesNotMatch(sent, new RegExp(forbidden))
    assert.doesNotMatch(sent, /OTHER_MEMORY_CONTEXT|canonicalLabel|edge-beta/)
  }
  assert.equal(f.sent.length, 2)
})

test('integrated real resolver refuses revoked source before provider dispatch', async () => {
  const f = integratedCouncilHarness()
  f.receipts.set(sourceA, { active: false, owner: uid, revision: 1 })
  const result = await f.invoke('memory-a')
  assert.notEqual(result.statusCode, 200)
  assert.equal(f.sent.length, 0)
})

test('integrated real resolver and handler deny missing separate evidence consent before dispatch', async () => {
  const f = integratedCouncilHarness()
  const result = await f.invoke('memory-a', { graphShareConsent: false })
  assert.equal(result.statusCode, 403)
  assert.equal(result.body.error, 'COUNCIL_GRAPH_DISCLOSURE_CONSENT_REQUIRED')
  assert.equal(f.sent.length, 0)
})

test('integrated real resolver and handler deny revoked provider processing', async () => {
  const f = integratedCouncilHarness()
  f.put('providerConnections/xai', { processingAllowed: false, revocationState: 'requested' })
  const result = await f.invoke('memory-b')
  assert.equal(result.statusCode, 403)
  assert.equal(result.body.error, 'PROVIDER_PROCESSING_REVOKED')
  assert.equal(f.sent.length, 0)
})
