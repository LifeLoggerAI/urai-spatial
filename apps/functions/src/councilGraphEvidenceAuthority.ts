import { createHash } from 'node:crypto'
import * as functions from 'firebase-functions/v1'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'
import { requireLifeItemSources, lifeAuthorityDigest, lifeItemDigest } from './lifeGraphAuthority'

const token = /^[A-Za-z0-9._:-]{1,160}$/
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const deny = (reason: string): never => { throw new functions.https.HttpsError('failed-precondition', reason) }
function ids(value: unknown, max: number): string[] {
  if (!Array.isArray(value) || value.length > max || value.some(x => typeof x !== 'string' || !token.test(x))
    || new Set(value).size !== value.length) deny('COUNCIL_GRAPH_IDS_INVALID')
  return value as string[]
}
export type CouncilGraphSelection = { snapshotId: string; entityIds: string[] }
export function parseCouncilGraphSelection(input: unknown): CouncilGraphSelection {
  if (!input || typeof input !== 'object' || Array.isArray(input)) deny('COUNCIL_GRAPH_SELECTION_INVALID')
  const x = input as Record<string, unknown>
  if (typeof x.snapshotId !== 'string' || !token.test(x.snapshotId)
    || Object.keys(x).some(key => key !== 'snapshotId' && key !== 'entityIds')) deny('COUNCIL_GRAPH_SELECTION_INVALID')
  const entityIds = ids(x.entityIds, 8)
  if (!entityIds.length) deny('COUNCIL_GRAPH_SELECTION_EMPTY')
  return { snapshotId: x.snapshotId as string, entityIds }
}

export async function readCouncilGraphEvidence(db: FirebaseFirestore.Firestore, uid: string, input: unknown) {
  const selection = parseCouncilGraphSelection(input)
  return db.runTransaction(async tx => {
    const policy = await tx.get(db.doc('users/' + uid + '/privacyPolicy/current'))
    const p = policy.data()
    if (!policy.exists || !isCanonicalStoredPolicy(p, uid)
      || p?.domains?.models?.modelContext !== true
      || !['granted', 'limited'].includes(p?.domains?.models?.mode)
      || !['granted', 'limited'].includes(p?.domains?.identity?.mode)
      || p?.enforcement?.state !== 'fully-enforced') deny('COUNCIL_MODEL_CONSENT_REQUIRED')
    const graph = await tx.get(db.doc('users/' + uid + '/lifeGraphSnapshots/' + selection.snapshotId))
    const data = graph.data() ?? {}
    if (!graph.exists || data.ownerId !== uid || data.state !== 'current'
      || data.schemaVersion !== 'urai-life-model-v1'
      || data.syntheticOutputMayBecomeHistoricalSource !== false) deny('COUNCIL_GRAPH_UNAVAILABLE')
    const { graphHash, compiledAt, updatedAt, ...body } = data
    if (typeof graphHash !== 'string' || hash(body) !== graphHash) deny('COUNCIL_GRAPH_HASH_INVALID')
    const entityIds = ids(data.entityIds, 128), claimIds = ids(data.claimIds, 128), edgeIds = ids(data.edgeIds, 128)
    if (!entityIds.length || !selection.entityIds.every(id => entityIds.includes(id))) deny('COUNCIL_GRAPH_SELECTION_INVALID')
    const [entities, claims, edges] = await Promise.all([
      tx.getAll(...entityIds.map(id => db.doc('users/' + uid + '/lifeEntities/' + id))),
      claimIds.length ? tx.getAll(...claimIds.map(id => db.doc('users/' + uid + '/lifeClaims/' + id))) : [],
      edgeIds.length ? tx.getAll(...edgeIds.map(id => db.doc('users/' + uid + '/lifeCausalEdges/' + id))) : [],
    ])
    const members = new Set(entityIds)
    if (!entities.every(e => e.exists && e.get('ownerId') === uid && e.get('revoked') !== true && e.get('synthetic') !== true)
      || !claims.every(c => c.exists && c.get('ownerId') === uid && c.get('synthetic') === false
        && ['accepted','disputed'].includes(String(c.get('status'))) && members.has(c.get('subjectEntityId')))
      || !edges.every(e => e.exists && e.get('ownerId') === uid && e.get('synthetic') === false
        && ['accepted','disputed'].includes(String(e.get('status')))
        && members.has(e.get('fromEntityId')) && members.has(e.get('toEntityId')))) deny('COUNCIL_GRAPH_DEPENDENCY_INVALID')
    for (const item of [...entities, ...claims, ...edges]) {
      const field = item.ref.parent.id === 'lifeEntities' ? 'createdFromSourceIds' : 'sourceIds'
      const bindings = await requireLifeItemSources(db, tx, uid, item.data() ?? {}, field)
      const prior = data.authorityBindings?.[item.ref.path]
      if (!prior || prior.itemDigest !== lifeItemDigest(item)
        || prior.sourceBindingDigest !== lifeAuthorityDigest(bindings)) deny('COUNCIL_GRAPH_SOURCE_CHANGED')
    }
    const selected = new Set(selection.entityIds)
    const cs = claims.filter(c => selected.has(c.get('subjectEntityId')))
    const es = edges.filter(e => selected.has(e.get('fromEntityId')) && selected.has(e.get('toEntityId')))
    if (cs.length > 24 || es.length > 24) deny('COUNCIL_GRAPH_SELECTION_TOO_LARGE')
    const evidence = {
      snapshotId: selection.snapshotId, graphHash,
      entities: entities.filter(e => selected.has(e.id)).map(e => ({ id: e.id, kind: e.get('kind'), label: e.get('canonicalLabel') })),
      claims: cs.map(c => ({ id: c.id, subjectEntityId: c.get('subjectEntityId'), predicate: c.get('predicate'), value: c.get('value'),
        confidence: c.get('confidence'), status: c.get('status'), evidenceClass: c.get('evidenceClass'), sourceIds: c.get('sourceIds') })),
      edges: es.map(e => ({ id: e.id, fromEntityId: e.get('fromEntityId'), toEntityId: e.get('toEntityId'),
        kind: e.get('kind'), status: e.get('status'), sourceIds: e.get('sourceIds') })),
    }
    if (Buffer.byteLength(JSON.stringify(evidence)) > 8192) deny('COUNCIL_GRAPH_EVIDENCE_TOO_LARGE')
    return evidence
  })
}


/**
 * Resolve the exact owner-held lineage from a persisted Memory Star to a
 * current SceneTruth packet and current Life Graph. Caller-provided memoryId
 * is a lookup key, NOT proof of a graph/claim association. A memory without a
 * real, current SceneTruth binding is intentionally not eligible.
 */
export async function resolveCouncilMemoryGraph(
  db: FirebaseFirestore.Firestore, uid: string, memoryIdInput: unknown,
) {
  if (typeof memoryIdInput !== 'string' || !token.test(memoryIdInput) || !uid) {
    deny('COUNCIL_MEMORY_SELECTION_INVALID')
  }
  const memoryId = memoryIdInput as string
  const binding = await db.runTransaction(async tx => {
    const memory = await tx.get(db.doc('users/' + uid + '/memories/' + memoryId))
    const m = memory.data() ?? {}
    if (!memory.exists || (m.ownerId ?? m.userId) !== uid || m.deleted === true
      || m.synthetic === true || m.demo === true || ['pending','revoked'].includes(String(m.consentState))) {
      deny('COUNCIL_MEMORY_NOT_AUTHORIZED')
    }
    const lifeMovie = m.lifeMovie
    if (!lifeMovie || typeof lifeMovie !== 'object' || Array.isArray(lifeMovie)) {
      deny('COUNCIL_MEMORY_SCENE_TRUTH_REQUIRED')
    }
    const sceneId = (lifeMovie as Record<string, unknown>).sceneTruthPacketId
    if (typeof sceneId !== 'string' || !token.test(sceneId)) deny('COUNCIL_MEMORY_SCENE_TRUTH_REQUIRED')
    const scene = await tx.get(db.doc('users/' + uid + '/sceneTruthPackets/' + sceneId))
    const packet = scene.data() ?? {}
    if (!scene.exists || packet.ownerId !== uid || packet.schemaVersion !== 'urai-life-model-v1'
      || packet.state !== 'current' || packet.syntheticOutputMayBecomeHistoricalSource !== false
      || !['READY', 'READY_WITH_OCCLUSION', 'READY_INTERPRETIVE'].includes(String(packet.decision))) {
      deny('COUNCIL_MEMORY_SCENE_UNAVAILABLE')
    }
    const { packetHash, compiledAt, updatedAt, ...packetBody } = packet
    if (typeof packetHash !== 'string' || hash(packetBody) !== packetHash) {
      deny('COUNCIL_MEMORY_SCENE_CHANGED')
    }
    // Memory-to-scene identity is immutable evidence, not an owner-equal lookup.
    if (packet.memoryId !== memoryId) deny('COUNCIL_MEMORY_SCENE_IDENTITY_MISMATCH')
    const movie = lifeMovie as Record<string, unknown>
    const provenance = movie.provenance
    const declaredSources = provenance && typeof provenance === 'object' && !Array.isArray(provenance)
      ? (provenance as Record<string, unknown>).sourceIds : undefined
    const memorySources = ids(declaredSources, 256)
    if (!memorySources.length || !Array.isArray(packet.memorySourceIds)
      || JSON.stringify(memorySources) !== JSON.stringify(packet.memorySourceIds)) {
      deny('COUNCIL_MEMORY_SOURCE_LINEAGE_MISMATCH')
    }
    const sourceBindings = await requireLifeItemSources(db, tx, uid, { sourceIds: memorySources }, 'sourceIds')
    if (packet.memorySourceBindingDigest !== lifeAuthorityDigest(sourceBindings)) {
      deny('COUNCIL_MEMORY_SOURCE_BINDING_CHANGED')
    }
    const graphId = packet.graphSnapshotId
    if (typeof graphId !== 'string' || !token.test(graphId)) deny('COUNCIL_MEMORY_GRAPH_REQUIRED')
    const graph = await tx.get(db.doc('users/' + uid + '/lifeGraphSnapshots/' + graphId))
    const g = graph.data() ?? {}
    if (!graph.exists || g.ownerId !== uid || g.state !== 'current'
      || g.schemaVersion !== 'urai-life-model-v1' || g.syntheticOutputMayBecomeHistoricalSource !== false
      || typeof g.graphHash !== 'string' || g.graphHash !== packet.graphHash) {
      deny('COUNCIL_MEMORY_GRAPH_CHANGED')
    }
    const graphEntities = new Set(ids(g.entityIds, 128))
    const graphClaims = new Set(ids(g.claimIds, 128))
    const graphSources = new Set(ids(g.sourceIds, 256))
    const knownClaimIds = ids(packet.knownClaimIds, 24)
    const bundleIds = ids(packet.personModelBundleIds, 8)
    const sceneSources = ids(packet.sourceIds, 256)
    if (knownClaimIds.some(id => !graphClaims.has(id)) || sceneSources.some(id => !graphSources.has(id))) {
      deny('COUNCIL_MEMORY_LINEAGE_CHANGED')
    }
    const [claims, bundles] = await Promise.all([
      knownClaimIds.length ? tx.getAll(...knownClaimIds.map(id => db.doc('users/' + uid + '/lifeClaims/' + id))) : [],
      bundleIds.length ? tx.getAll(...bundleIds.map(id => db.doc('users/' + uid + '/personModelBundles/' + id))) : [],
    ])
    if (!claims.every(c => c.exists && c.get('ownerId') === uid && c.get('synthetic') === false
      && c.get('status') === 'accepted')
      || !bundles.every(b => b.exists && b.get('ownerId') === uid && b.get('state') === 'current'
        && b.get('synthetic') === false && b.get('schemaVersion') === 'urai-life-model-v1')) {
      deny('COUNCIL_MEMORY_EVIDENCE_UNAVAILABLE')
    }
    const selected = [...new Set([
      ...claims.map(c => String(c.get('subjectEntityId') ?? '')),
      ...bundles.map(b => String(b.get('personId') ?? '')),
    ])]
    if (!selected.length || selected.length > 8 || selected.some(id => !token.test(id) || !graphEntities.has(id))) {
      deny('COUNCIL_MEMORY_ENTITY_BINDING_UNAVAILABLE')
    }
    return {
      memoryId, memoryTitle: String(m.title ?? 'Selected memory').slice(0, 180),
      sceneTruthPacketId: sceneId, packetHash, snapshotId: graphId, graphHash: g.graphHash,
      entityIds: selected,
    }
  })
  // Reuse the full source-receipt / C1 / model-consent authority reader. Never
  // return a presumed verified graph from SceneTruth alone.
  const evidence = await readCouncilGraphEvidence(db, uid, {
    snapshotId: binding.snapshotId, entityIds: binding.entityIds,
  })
  if (evidence.graphHash !== binding.graphHash) deny('COUNCIL_MEMORY_GRAPH_CHANGED')
  return { ...binding, evidence }
}
