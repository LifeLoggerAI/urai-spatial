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
