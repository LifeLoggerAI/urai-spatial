import { createHash } from 'node:crypto'

type Snapshot = FirebaseFirestore.DocumentSnapshot
type Reader = { get(path: string): Promise<Snapshot>; getAll(paths: string[]): Promise<Snapshot[]> }
export type PresenceMode = 'HISTORICAL_AS_OF' | 'ARCHIVE_PRESENT' | 'SIMULATION_PRESENT'
const TOKEN = /^[A-Za-z0-9._:-]{1,160}$/
const SHA256 = /^[a-f0-9]{64}$/
const MODES = new Set(['HISTORICAL_AS_OF','ARCHIVE_PRESENT','SIMULATION_PRESENT'])
const MAX_EVIDENCE_CLAIMS = 40
const MAX_EVIDENCE_CHARS = 14_000
const EVIDENCE = new Set(['SOURCE_CAPTURED','SOURCE_DERIVED','DIRECT_SUBJECT_TESTIMONY','ATTRIBUTED_TESTIMONY','CORROBORATED_INFERENCE','CONTEXTUAL_RESEARCH'])

export class PersonPresenceAuthorityError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'PersonPresenceAuthorityError' }
}
function fail(code: string): never { throw new PersonPresenceAuthorityError(code) }
function token(value: unknown) { if (typeof value !== 'string' || !TOKEN.test(value)) fail('PRESENCE_AUTHORITY_ID_INVALID'); return value }
function tokens(value: unknown, maximum = 512) {
  if (!Array.isArray(value) || value.length > maximum) fail('PRESENCE_AUTHORITY_DEPENDENCIES_INVALID')
  return [...new Set(value.map(token))]
}
function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }
function hash(value: unknown) { if (typeof value !== 'string' || !SHA256.test(value)) fail('PRESENCE_AUTHORITY_HASH_REQUIRED'); return value }
function owned(snapshot: Snapshot, uid: string) { return snapshot.exists && snapshot.get('ownerId') === uid }
function current(snapshot: Snapshot, uid: string) { return owned(snapshot, uid) && snapshot.get('schemaVersion') === 'urai-life-model-v1' && snapshot.get('state') === 'current' }
function mode(value: unknown): PresenceMode { if (!MODES.has(String(value))) fail('PRESENCE_MODE_INVALID'); return value as PresenceMode }

export type PersonPresenceAuthority = {
  personId: string; bundleId: string; sceneTruthPacketId: string; graphSnapshotId: string
  bundleHash: string; sceneTruthHash: string; graphHash: string; authorityDigest: string
  mode: PresenceMode; knowledgeCutoff: string | null; asOf: string; canonicalLabel: string
  dependencyIds: string[]; sourceIds: string[]; negativeConstraints: unknown[]
  sceneUnknowns: string[]; forbiddenAssertions: string[]
  evidence: Array<{ id: string; predicate: string; value: unknown; evidenceClass: string; confidence: string }>
}

async function bundleAuthority(reader: Reader, uid: string, input: { bundleId: string; sceneTruthPacketId: string; mode: PresenceMode }): Promise<PersonPresenceAuthority> {
  const bundleId = token(input.bundleId), sceneTruthPacketId = token(input.sceneTruthPacketId), selectedMode = mode(input.mode)
  const [bundle, scene] = await reader.getAll([`users/${uid}/personModelBundles/${bundleId}`, `users/${uid}/sceneTruthPackets/${sceneTruthPacketId}`])
  if (!current(bundle, uid) || bundle.get('synthetic') !== false) fail('PERSON_MODEL_STALE')
  if (!current(scene, uid) || scene.get('syntheticOutputMayBecomeHistoricalSource') !== false
    || !['READY','READY_WITH_OCCLUSION','READY_INTERPRETIVE'].includes(String(scene.get('decision')))) fail('PRESENCE_SCENE_TRUTH_UNAVAILABLE')
  if (!tokens(scene.get('personModelBundleIds'), 64).includes(bundleId)) fail('PRESENCE_FOREIGN_SCENE')
  const personId = token(bundle.get('personId')), stateId = token(bundle.get('stateId')), graphSnapshotId = token(scene.get('graphSnapshotId'))
  const [person, state, graph] = await reader.getAll([`users/${uid}/lifeEntities/${personId}`, `users/${uid}/lifeEntityStates/${stateId}`, `users/${uid}/lifeGraphSnapshots/${graphSnapshotId}`])
  if (!owned(person, uid) || person.get('kind') !== 'person' || person.get('revoked') === true) fail('PERSON_AUTHORITY_UNAVAILABLE')
  if (!owned(state, uid) || state.get('entityId') !== personId || state.get('asOf') !== bundle.get('asOf')
    || (state.get('knowledgeCutoff') ?? null) !== (bundle.get('knowledgeCutoff') ?? null)) fail('PERSON_TEMPORAL_STATE_STALE')
  if (!current(graph, uid) || graph.get('syntheticOutputMayBecomeHistoricalSource') !== false
    || !tokens(graph.get('entityIds')).includes(personId)) fail('PRESENCE_GRAPH_UNAVAILABLE')
  const bundleHash = hash(bundle.get('bundleHash')), sceneTruthHash = hash(scene.get('packetHash')), graphHash = hash(graph.get('graphHash'))
  const knowledgeCutoff = typeof bundle.get('knowledgeCutoff') === 'string' ? bundle.get('knowledgeCutoff') as string : null
  if (selectedMode === 'HISTORICAL_AS_OF' && (!knowledgeCutoff || !Number.isFinite(Date.parse(knowledgeCutoff)))) fail('PRESENCE_KNOWLEDGE_CUTOFF_REQUIRED')
  const acceptedClaimIds = tokens(bundle.get('acceptedClaimIds'), 256), graphClaims = new Set(tokens(graph.get('claimIds')))
  if (!acceptedClaimIds.length || acceptedClaimIds.some((id) => !graphClaims.has(id))) fail('PRESENCE_EVIDENCE_GRAPH_MISMATCH')
  const claims = await reader.getAll(acceptedClaimIds.map((id) => `users/${uid}/lifeClaims/${id}`))
  const evidence: PersonPresenceAuthority['evidence'] = [], claimDigests: string[] = []; let evidenceChars = 0
  for (const claim of claims) {
    if (!owned(claim, uid) || claim.get('subjectEntityId') !== personId || claim.get('status') !== 'accepted'
      || claim.get('synthetic') !== false || !EVIDENCE.has(String(claim.get('evidenceClass')))) fail('PRESENCE_EVIDENCE_STALE')
    const sourceIds = tokens(claim.get('sourceIds'), 128); if (!sourceIds.length) fail('PRESENCE_EVIDENCE_SOURCE_REQUIRED')
    const value = claim.get('value'), valueBytes = JSON.stringify(value)
    if (valueBytes === undefined || Buffer.byteLength(valueBytes) > 8192 || digest(value) !== claim.get('valueDigest')) fail('PRESENCE_EVIDENCE_VALUE_CHANGED')
    const row = { id: claim.id, predicate: token(claim.get('predicate')), value, evidenceClass: String(claim.get('evidenceClass')), confidence: String(claim.get('confidence')) }
    claimDigests.push(digest({ ...row, sourceIds, synthetic: false, status: 'accepted' }))
    const size = Buffer.byteLength(JSON.stringify(row))
    if (evidence.length < MAX_EVIDENCE_CLAIMS && evidenceChars + size <= MAX_EVIDENCE_CHARS) { evidence.push(row); evidenceChars += size }
  }
  if (!evidence.length) fail('PRESENCE_EVIDENCE_REQUIRED')
  const sourceIds = [...new Set([...tokens(bundle.get('sourceIds')), ...tokens(scene.get('sourceIds')), ...tokens(graph.get('sourceIds'))])]
  if (!sourceIds.length) fail('PRESENCE_SOURCE_LINEAGE_REQUIRED')
  const dependencyIds = [...new Set([bundleId, sceneTruthPacketId, graphSnapshotId, personId, stateId, ...sourceIds,
    ...tokens(bundle.get('dependencyIds')), ...tokens(scene.get('dependencyIds'), 2048), ...tokens(graph.get('dependencyIds'), 2048)])]
  const authorityDigest = digest({ bundleId, sceneTruthPacketId, graphSnapshotId, bundleHash, sceneTruthHash, graphHash,
    personRevision: person.get('revision') ?? null, mode: selectedMode, knowledgeCutoff, claimDigests })
  return { personId, bundleId, sceneTruthPacketId, graphSnapshotId, bundleHash, sceneTruthHash, graphHash, authorityDigest,
    mode: selectedMode, knowledgeCutoff: selectedMode === 'HISTORICAL_AS_OF' ? knowledgeCutoff : null,
    asOf: String(bundle.get('asOf') ?? ''), canonicalLabel: String(person.get('canonicalLabel') ?? 'this person').slice(0, 180),
    sourceIds, dependencyIds, evidence,
    negativeConstraints: Array.isArray(bundle.get('negativeConstraints')) ? bundle.get('negativeConstraints').slice(0, 64) : [],
    sceneUnknowns: tokensOrText(scene.get('unknowns')), forbiddenAssertions: tokensOrText(scene.get('forbiddenAssertions')) }
}
function tokensOrText(value: unknown) { return Array.isArray(value) ? value.slice(0, 128).map((item) => String(item).slice(0, 320)) : [] }
function inTransaction<T>(db: FirebaseFirestore.Firestore, operation: (reader: Reader) => Promise<T>) {
  return db.runTransaction((transaction) => operation({ get: (ref) => transaction.get(db.doc(ref)),
    getAll: (refs) => refs.length ? transaction.getAll(...refs.map((ref) => db.doc(ref))) : Promise.resolve([]) }))
}
export function preparePersonPresenceAuthority(db: FirebaseFirestore.Firestore, uid: string, input: { bundleId: string; sceneTruthPacketId: string; mode: PresenceMode }) {
  return inTransaction(db, (reader) => bundleAuthority(reader, uid, input))
}
export function loadPersonPresenceAuthority(db: FirebaseFirestore.Firestore, uid: string, sessionId: string) {
  return inTransaction(db, async (reader) => {
    const session = await reader.get(`users/${uid}/simulationSessions/${token(sessionId)}`)
    if (!owned(session, uid) || session.get('state') !== 'active' || session.get('presentationClass') !== 'SIMULATED'
      || session.get('historicalSourceAuthority') !== false || session.get('syntheticOutputMayBecomeHistoricalSource') !== false) fail('PRESENCE_SESSION_UNAVAILABLE')
    const authority = await bundleAuthority(reader, uid, { bundleId: token(session.get('bundleId')), sceneTruthPacketId: token(session.get('sceneTruthPacketId')), mode: mode(session.get('mode')) })
    if (session.get('personId') !== authority.personId || session.get('authorityDigest') !== authority.authorityDigest
      || session.get('bundleHash') !== authority.bundleHash || session.get('sceneTruthHash') !== authority.sceneTruthHash || session.get('graphHash') !== authority.graphHash
      || session.get('knowledgeCutoff') !== authority.knowledgeCutoff) fail('PRESENCE_AUTHORITY_CHANGED')
    return { ...authority, sessionId }
  })
}
export async function requirePersonPresenceRenderBinding(db: FirebaseFirestore.Firestore, uid: string, authority: PersonPresenceAuthority, modality: string) {
  const binding = await db.doc(`users/${uid}/personRenderBindings/${authority.bundleId}:${token(modality)}`).get()
  if (!owned(binding, uid) || binding.get('personId') !== authority.personId || binding.get('bundleId') !== authority.bundleId
    || binding.get('modality') !== modality || binding.get('reviewState') !== 'ACCEPTED' || binding.get('consentState') !== 'authorized'
    || binding.get('state') !== 'current' || binding.get('bundleHash') !== authority.bundleHash || binding.get('sourceAuthorityHash') !== authority.bundleHash) fail('ACCEPTED_PERSON_RENDER_NOT_READY')
  return binding
}

async function invalidateCollections(db: FirebaseFirestore.Firestore, uid: string, collections: string[], reasonId: string, revoked: boolean, timestamp: unknown, dependencyId?: string) {
  let count = 0
  for (const collection of collections) {
    let last: Snapshot | undefined
    while (true) {
      let query: FirebaseFirestore.Query = db.collection(`users/${uid}/${collection}`)
      if (dependencyId) query = query.where('dependencyIds', 'array-contains', dependencyId)
      query = query.limit(200)
      if (last) query = query.startAfter(last)
      const snapshot = await query.get(); if (snapshot.empty) break
      if (count + snapshot.size > 2000) fail('LIFE_MODEL_INVALIDATION_BOUND_REQUIRES_OPERATOR')
      const batch = db.batch()
      for (const doc of snapshot.docs) {
        if (doc.get('ownerId') !== uid) fail('LIFE_MODEL_INVALIDATION_OWNER_MISMATCH')
        batch.set(doc.ref, { state: revoked ? 'revoked' : 'invalidated', invalidatedBy: reasonId, invalidatedAt: timestamp }, { merge: true })
      }
      await batch.commit(); count += snapshot.size; last = snapshot.docs[snapshot.docs.length - 1]
      if (snapshot.size < 200) break
    }
  }
  return count
}
export function invalidateLifeModelDependencies(db: FirebaseFirestore.Firestore, uid: string, dependencyId: string, reasonId: string, revoked: boolean, timestamp: unknown) {
  return invalidateCollections(db, uid, ['lifeGraphSnapshots','personModelBundles','sceneTruthPackets','renderManifests','lifeMovies','simulationSessions','personRenderBindings'], reasonId, revoked, timestamp, dependencyId)
}
export function revokePersonPresenceConsentDerivatives(db: FirebaseFirestore.Firestore, uid: string, reasonId: string, timestamp: unknown) {
  return invalidateCollections(db, uid, ['personModelBundles','personRenderBindings','sceneTruthPackets','renderManifests','simulationSessions'], reasonId, true, timestamp)
}
