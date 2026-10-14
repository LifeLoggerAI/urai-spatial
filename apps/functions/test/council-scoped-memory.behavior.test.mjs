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
function load(file, imports) {
  const source = fs.readFileSync(new URL('../src/' + file, import.meta.url), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(js, { module, exports: module.exports, Buffer, require(name) {
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
  const db = { doc: path => ({ path }), async runTransaction(callback) {
    const tx = { get: async ref => snapshot(ref.path),
      getAll: async (...refs) => refs.map(ref => snapshot(ref.path)) }
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
