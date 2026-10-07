import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'
import { invalidateLifeModelDependencies } from './personPresenceAuthority'
import { readLifeSourceBindings, requireLifeItemSources, lifeItemDigest, lifeAuthorityDigest } from './lifeGraphAuthority'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const lifeModelFunctions = functions.region('us-central1')
const fieldValue = admin.firestore.FieldValue
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,160}$/
const ENTITY_KINDS = new Set(['person','place','object','event','relationship','organization','media','statement'])
const EVIDENCE_CLASSES = new Set([
  'SOURCE_CAPTURED','SOURCE_DERIVED','DIRECT_SUBJECT_TESTIMONY',
  'ATTRIBUTED_TESTIMONY','CORROBORATED_INFERENCE','CONTEXTUAL_RESEARCH','UNKNOWN',
])
const CONFIDENCE = new Set(['confirmed','probable','approximate','unknown'])
const CLAIM_STATUS = new Set(['accepted','disputed'])
const PRESENTATION_CLASSES = new Set(['ARCHIVAL','RECONSTRUCTED','INTERPRETIVE','SIMULATED','COUNTERFACTUAL'])
const CAUSAL_EDGE_KINDS = new Set(['PARTICIPATED_IN','OCCURRED_AT','INVOLVES_OBJECT','RELATES_TO','CAUSED','CHANGED','EVIDENCED_BY','BEFORE','AFTER','OWNED','LIVED_AT'])
const MAX_CLAIMS_PER_STATE = 256

type JsonMap = Record<string, unknown>

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function requireToken(value: unknown, label: string) {
  const token = String(value ?? '').trim()
  if (!SAFE_TOKEN.test(token)) throw new functions.https.HttpsError('invalid-argument', `${label} is invalid.`)
  return token
}

function requireString(value: unknown, label: string, maxLength = 240) {
  const output = String(value ?? '').trim()
  if (!output || output.length > maxLength) {
    throw new functions.https.HttpsError('invalid-argument', `${label} is invalid.`)
  }
  return output
}

function tokenArray(value: unknown, maximum = 128) {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new functions.https.HttpsError('invalid-argument', 'Token array is invalid.')
  }
  const values = value.map((item) => requireToken(item, 'token'))
  return [...new Set(values)]
}

function optionalTokenArray(value: unknown, maximum = 128) {
  if (value === undefined) return [] as string[]
  return tokenArray(value, maximum)
}

function boundedStringArray(value: unknown, maximum = 128, maxLength = 320) {
  if (value === undefined) return [] as string[]
  if (!Array.isArray(value) || value.length > maximum) {
    throw new functions.https.HttpsError('invalid-argument', 'String array is invalid.')
  }
  return [...new Set(value.map((item) => requireString(item, 'string', maxLength)))]
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function boundedJson(value: unknown) {
  if (value === undefined) throw new functions.https.HttpsError('invalid-argument', 'Claim value is required.')
  const encoded = JSON.stringify(value)
  if (encoded === undefined || Buffer.byteLength(encoded, 'utf8') > 8_192) {
    throw new functions.https.HttpsError('invalid-argument', 'Claim value is too large.')
  }
  return value
}

function stableDigest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function requireModelConsent(uid: string, transaction?: FirebaseFirestore.Transaction) {
  const ref = db.doc(`users/${uid}/privacyPolicy/current`)
  const snapshot = transaction ? await transaction.get(ref) : await ref.get()
  if (!snapshot.exists) throw new functions.https.HttpsError('failed-precondition', 'CONSENT_POLICY_REQUIRED')
  const policy = snapshot.data() ?? {}
  const domains = isRecord(policy.domains) ? policy.domains : {}
  const models = isRecord(domains.models) ? domains.models : {}
  const identity = isRecord(domains.identity) ? domains.identity : {}
  const enforcement = isRecord(policy.enforcement) ? policy.enforcement : {}
  if (!['granted','limited'].includes(String(models.mode ?? '')) || models.modelContext !== true) {
    throw new functions.https.HttpsError('permission-denied', 'MODEL_CONTEXT_NOT_AUTHORIZED')
  }
  if (!['granted','limited'].includes(String(identity.mode ?? ''))) {
    throw new functions.https.HttpsError('permission-denied', 'IDENTITY_MODEL_NOT_AUTHORIZED')
  }
  if (enforcement.state !== 'fully-enforced') {
    throw new functions.https.HttpsError('failed-precondition', 'CONSENT_ENFORCEMENT_PENDING')
  }
}

async function invalidateDependency(uid: string, dependencyId: string, reasonId: string, revoked = false) {
  return invalidateLifeModelDependencies(db, uid, dependencyId, reasonId, revoked, fieldValue.serverTimestamp())
}

export const upsertLifeEntity = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const id = requireToken(data?.id, 'entityId')
  const kind = String(data?.kind ?? '')
  if (!ENTITY_KINDS.has(kind)) throw new functions.https.HttpsError('invalid-argument', 'Entity kind is invalid.')
  const canonicalLabel = requireString(data?.canonicalLabel, 'canonicalLabel', 180)
  const aliases = Array.isArray(data?.aliases)
    ? data.aliases.slice(0, 24).map((alias: unknown) => requireString(alias, 'alias', 120))
    : []
  const createdFromSourceIds = tokenArray(data?.createdFromSourceIds, 128)
  if (!createdFromSourceIds.length) throw new functions.https.HttpsError('invalid-argument', 'At least one source is required.')

  if (data?.synthetic === true) throw new functions.https.HttpsError('failed-precondition', 'SYNTHETIC_ENTITY_CANNOT_ENTER_HISTORICAL_GRAPH')
  const ref = db.doc(`users/${uid}/lifeEntities/${id}`)
  await db.runTransaction(async (transaction) => {
    await requireModelConsent(uid, transaction)
    const bindings = await readLifeSourceBindings(db, transaction, uid, createdFromSourceIds)
    const current = await transaction.get(ref)
    transaction.set(ref, {
      id,
      ownerId: uid,
      kind,
      canonicalLabel,
      aliases: [...new Set(aliases)],
      createdFromSourceIds,
      sourceBindingDigest: lifeAuthorityDigest(bindings),
      revoked: false,
      revision: Math.max(1, Number(current.get('revision') ?? 0) + 1),
      createdAt: current.exists ? current.get('createdAt') ?? fieldValue.serverTimestamp() : fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    }, { merge: true })
  })
  await invalidateDependency(uid, id, `entity-update:${id}`)
  return { id, kind }
})

export const upsertLifeClaim = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const id = requireToken(data?.id, 'claimId')
  const subjectEntityId = requireToken(data?.subjectEntityId, 'subjectEntityId')
  const predicate = requireToken(data?.predicate, 'predicate')
  const evidenceClass = String(data?.evidenceClass ?? '')
  const confidence = String(data?.confidence ?? '')
  const status = String(data?.status ?? '')
  if (!EVIDENCE_CLASSES.has(evidenceClass)) throw new functions.https.HttpsError('invalid-argument', 'Evidence class is invalid.')
  if (!CONFIDENCE.has(confidence)) throw new functions.https.HttpsError('invalid-argument', 'Confidence is invalid.')
  if (!CLAIM_STATUS.has(status)) throw new functions.https.HttpsError('invalid-argument', 'Claim status is invalid.')
  if (data?.synthetic === true) {
    throw new functions.https.HttpsError('failed-precondition', 'SYNTHETIC_OUTPUT_CANNOT_ENTER_HISTORICAL_CLAIMS')
  }
  const sourceIds = tokenArray(data?.sourceIds, 128)
  if (evidenceClass !== 'UNKNOWN' && !sourceIds.length) {
    throw new functions.https.HttpsError('invalid-argument', 'Evidence-backed claims require source IDs.')
  }
  const ref = db.doc(`users/${uid}/lifeClaims/${id}`)
  const value = boundedJson(data?.value)
  const payload = {
    id,
    ownerId: uid,
    subjectEntityId,
    predicate,
    value,
    evidenceClass,
    sourceIds,
    confidence,
    status,
    synthetic: false,
    valueDigest: stableDigest(value),
    updatedAt: fieldValue.serverTimestamp(),
  }
  if (evidenceClass === 'UNKNOWN' && (status !== 'disputed' || confidence !== 'unknown')) {
    throw new functions.https.HttpsError('failed-precondition', 'OWNER_ASSERTION_REQUIRES_NONHISTORICAL_CLASSIFICATION')
  }
  const idempotent = await db.runTransaction(async (transaction) => {
    await requireModelConsent(uid, transaction)
    const entity = await transaction.get(db.doc(`users/${uid}/lifeEntities/${subjectEntityId}`))
    const existing = await transaction.get(ref)
    if (!entity.exists || entity.get('ownerId') !== uid || entity.get('revoked') === true) {
      throw new functions.https.HttpsError('failed-precondition', 'Subject entity is unavailable.')
    }
    if (evidenceClass !== 'UNKNOWN') {
      // Historical evidence enters through protected producer output and the
      // exact canonical owner-review transaction. Client flags do not confer it.
      if (!existing.exists || existing.get('ownerId') !== uid || typeof existing.get('privateLifeModelReviewId') !== 'string') {
        throw new functions.https.HttpsError('failed-precondition', 'HISTORICAL_CLAIM_OWNER_REVIEW_REQUIRED')
      }
      await requireLifeItemSources(db, transaction, uid, existing.data() ?? {}, 'sourceIds')
      for (const key of ['subjectEntityId','predicate','evidenceClass','confidence','status','valueDigest']) {
        if (existing.get(key) !== payload[key as keyof typeof payload]) {
          throw new functions.https.HttpsError('failed-precondition', 'HISTORICAL_CLAIM_REVIEW_CONTENT_MISMATCH')
        }
      }
      if (lifeAuthorityDigest(existing.get('sourceIds')) !== lifeAuthorityDigest(sourceIds) || existing.get('synthetic') !== false) {
        throw new functions.https.HttpsError('failed-precondition', 'HISTORICAL_CLAIM_REVIEW_CONTENT_MISMATCH')
      }
      return true
    }
    if (existing.exists && existing.get('evidenceClass') !== 'UNKNOWN') {
      throw new functions.https.HttpsError('failed-precondition', 'HISTORICAL_CLAIM_REQUIRES_CORRECTION')
    }
    transaction.set(ref, { ...payload, historicalSourceAuthority: false,
      syntheticOutputMayBecomeHistoricalSource: false,
      createdAt: existing.exists ? existing.get('createdAt') : fieldValue.serverTimestamp()
    }, { merge: true })
    return false
  })
  if (idempotent) return { id, subjectEntityId, evidenceClass, idempotent: true }
  await invalidateDependency(uid, id, `claim-update:${id}`)
  return { id, subjectEntityId, evidenceClass }
})

export const upsertLifeCausalEdge = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const id = requireToken(data?.id, 'edgeId')
  const fromEntityId = requireToken(data?.fromEntityId, 'fromEntityId')
  const toEntityId = requireToken(data?.toEntityId, 'toEntityId')
  const kind = String(data?.kind ?? '')
  const evidenceClass = String(data?.evidenceClass ?? '')
  const confidence = String(data?.confidence ?? '')
  const status = String(data?.status ?? '')
  if (!CAUSAL_EDGE_KINDS.has(kind)) throw new functions.https.HttpsError('invalid-argument', 'Causal edge kind is invalid.')
  if (!EVIDENCE_CLASSES.has(evidenceClass) || evidenceClass === 'UNKNOWN') {
    throw new functions.https.HttpsError('invalid-argument', 'Causal edges require evidence-backed classification.')
  }
  if (!CONFIDENCE.has(confidence) || confidence === 'unknown') throw new functions.https.HttpsError('invalid-argument', 'Causal edge confidence is invalid.')
  if (!CLAIM_STATUS.has(status)) throw new functions.https.HttpsError('invalid-argument', 'Causal edge status is invalid.')
  if (data?.synthetic === true) throw new functions.https.HttpsError('failed-precondition', 'SYNTHETIC_OUTPUT_CANNOT_ENTER_LIFE_CAUSAL_GRAPH')
  const sourceIds = tokenArray(data?.sourceIds, 128)
  if (!sourceIds.length) throw new functions.https.HttpsError('invalid-argument', 'Causal edges require source IDs.')
  await db.runTransaction(async (transaction) => {
  await requireModelConsent(uid, transaction)
  await readLifeSourceBindings(db, transaction, uid, sourceIds)
  const [fromEntity, toEntity] = await Promise.all([
    transaction.get(db.doc(`users/${uid}/lifeEntities/${fromEntityId}`)),
    transaction.get(db.doc(`users/${uid}/lifeEntities/${toEntityId}`)),
  ])
  if (
    !fromEntity.exists || !toEntity.exists
    || fromEntity.get('ownerId') !== uid || toEntity.get('ownerId') !== uid
    || fromEntity.get('revoked') === true || toEntity.get('revoked') === true
  ) throw new functions.https.HttpsError('failed-precondition', 'Causal edge entities are unavailable.')

  const existing = await transaction.get(db.doc(`users/${uid}/lifeCausalEdges/${id}`))
  if (!existing.exists || existing.get('ownerId') !== uid || typeof existing.get('privateLifeModelReviewId') !== 'string') {
    throw new functions.https.HttpsError('failed-precondition', 'HISTORICAL_EDGE_OWNER_REVIEW_REQUIRED')
  }
  await requireLifeItemSources(db, transaction, uid, existing.data() ?? {}, 'sourceIds')
  const requested = { fromEntityId, toEntityId, kind, evidenceClass, confidence, status }
  for (const key of Object.keys(requested) as Array<keyof typeof requested>) {
    if (existing.get(key) !== requested[key]) throw new functions.https.HttpsError('failed-precondition', 'HISTORICAL_EDGE_REVIEW_CONTENT_MISMATCH')
  }
  if (existing.get('synthetic') !== false || lifeAuthorityDigest(existing.get('sourceIds')) !== lifeAuthorityDigest(sourceIds)) {
    throw new functions.https.HttpsError('failed-precondition', 'HISTORICAL_EDGE_REVIEW_CONTENT_MISMATCH')
  }
  })
  return { id, fromEntityId, toEntityId, kind }
})

export const compileLifeCausalGraphSnapshot = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const snapshotId = requireToken(data?.snapshotId, 'snapshotId')
  const entityIds = tokenArray(data?.entityIds, 512)
  const claimIds = optionalTokenArray(data?.claimIds, 1024)
  const edgeIds = optionalTokenArray(data?.edgeIds, 1024)
  if (!entityIds.length) throw new functions.https.HttpsError('invalid-argument', 'Graph snapshot requires entities.')

  return db.runTransaction(async (transaction) => {
  await requireModelConsent(uid, transaction)
  const [entities, claims, edges] = await Promise.all([
    transaction.getAll(...entityIds.map((id) => db.doc(`users/${uid}/lifeEntities/${id}`))),
    claimIds.length ? transaction.getAll(...claimIds.map((id) => db.doc(`users/${uid}/lifeClaims/${id}`))) : [],
    edgeIds.length ? transaction.getAll(...edgeIds.map((id) => db.doc(`users/${uid}/lifeCausalEdges/${id}`))) : [],
  ])
  if (!entities.every((entity) => entity.exists && entity.get('ownerId') === uid && entity.get('revoked') !== true && entity.get('synthetic') !== true)) {
    throw new functions.https.HttpsError('failed-precondition', 'Graph entities are unavailable.')
  }
  if (!claims.every((claim) =>
    claim.exists && claim.get('ownerId') === uid && claim.get('synthetic') === false && ['accepted','disputed'].includes(String(claim.get('status') ?? ''))
  )) throw new functions.https.HttpsError('failed-precondition', 'Graph claims are unavailable.')
  if (!edges.every((edge) =>
    edge.exists && edge.get('ownerId') === uid && edge.get('synthetic') === false && ['accepted','disputed'].includes(String(edge.get('status') ?? ''))
  )) throw new functions.https.HttpsError('failed-precondition', 'Graph causal edges are unavailable.')

  const selectedEntities = new Set(entityIds)
  if (claims.some(claim => !selectedEntities.has(claim.get('subjectEntityId')))
    || edges.some(edge => !selectedEntities.has(edge.get('fromEntityId')) || !selectedEntities.has(edge.get('toEntityId')))) {
    throw new functions.https.HttpsError('failed-precondition', 'Graph dependency identity is incomplete.')
  }
  const authorityBindings: Record<string, unknown> = {}
  const sourceIds = new Set<string>()
  for (const item of [...entities, ...claims, ...edges]) {
    const field = item.ref.parent.id === 'lifeEntities' ? 'createdFromSourceIds' : 'sourceIds'
    const bindings = await requireLifeItemSources(db, transaction, uid, item.data() ?? {}, field)
    authorityBindings[item.ref.path] = { itemDigest: lifeItemDigest(item), sourceBindingDigest: lifeAuthorityDigest(bindings) }
    for (const sourceId of Array.isArray(item.get(field)) ? item.get(field) : []) sourceIds.add(String(sourceId))
  }
  const dependencyIds = [...new Set([...entityIds, ...claimIds, ...edgeIds, ...sourceIds])]
  const graphBody = {
    schemaVersion: 'urai-life-model-v1',
    ownerId: uid,
    id: snapshotId,
    entityIds,
    claimIds,
    edgeIds,
    sourceIds: [...sourceIds],
    dependencyIds,
    authorityBindings,
    syntheticOutputMayBecomeHistoricalSource: false,
    state: 'current',
  }
  const graphHash = stableDigest(graphBody)
  transaction.set(db.doc(`users/${uid}/lifeGraphSnapshots/${snapshotId}`), {
    ...graphBody,
    graphHash,
    compiledAt: fieldValue.serverTimestamp(),
    updatedAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  return { snapshotId, graphHash, entityCount: entityIds.length, claimCount: claimIds.length, edgeCount: edgeIds.length }
  })
})

export const upsertLifeEntityState = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const id = requireToken(data?.id, 'stateId')
  const entityId = requireToken(data?.entityId, 'entityId')
  const asOf = requireString(data?.asOf, 'asOf', 64)
  const claimIds = tokenArray(data?.claimIds, MAX_CLAIMS_PER_STATE)
  const relationshipContextIds = optionalTokenArray(data?.relationshipContextIds, 128)
  const sourceIds = tokenArray(data?.sourceIds, 128)
  const knowledgeCutoff = data?.knowledgeCutoff ? requireString(data.knowledgeCutoff, 'knowledgeCutoff', 64) : null
  const negativeConstraints = Array.isArray(data?.negativeConstraints) ? data.negativeConstraints.slice(0, 128).map((entry: unknown) => {
    if (!isRecord(entry)) throw new functions.https.HttpsError('invalid-argument', 'Negative constraint is invalid.')
    return {
      id: requireToken(entry.id, 'constraintId'),
      subjectEntityId: entityId,
      rule: requireToken(entry.rule, 'constraintRule'),
      sourceIds: tokenArray(entry.sourceIds, 32),
    }
  }) : []

  await db.runTransaction(async (transaction) => {
    await requireModelConsent(uid, transaction)
    const bindings = await readLifeSourceBindings(db, transaction, uid, sourceIds)
    const [entity, existing, claims, relationships] = await Promise.all([
      transaction.get(db.doc(`users/${uid}/lifeEntities/${entityId}`)),
      transaction.get(db.doc(`users/${uid}/lifeEntityStates/${id}`)),
      claimIds.length ? transaction.getAll(...claimIds.map(claimId => db.doc(`users/${uid}/lifeClaims/${claimId}`))) : [],
      relationshipContextIds.length ? transaction.getAll(...relationshipContextIds.map(edgeId => db.doc(`users/${uid}/lifeCausalEdges/${edgeId}`))) : [],
    ])
    if (!entity.exists || entity.get('ownerId') !== uid || entity.get('revoked') === true
      || (existing.exists && existing.get('ownerId') !== uid)) {
      throw new functions.https.HttpsError('failed-precondition', 'Entity or temporal state is unavailable.')
    }
    const entityBindings = await requireLifeItemSources(db, transaction, uid, entity.data() ?? {}, 'createdFromSourceIds')
    if (entityBindings.some(binding => !sourceIds.includes(binding.id))) throw new functions.https.HttpsError('failed-precondition', 'STATE_SOURCE_SET_INCOMPLETE')
    const authorityBindings: Record<string, unknown> = {}
    for (const claim of claims) {
      if (!claim.exists || claim.get('ownerId') !== uid || claim.get('subjectEntityId') !== entityId
        || claim.get('synthetic') === true || !['accepted','disputed'].includes(String(claim.get('status')))) {
        throw new functions.https.HttpsError('failed-precondition', 'STATE_CLAIM_AUTHORITY_UNAVAILABLE')
      }
      const current = await requireLifeItemSources(db, transaction, uid, claim.data() ?? {}, 'sourceIds')
      if (current.some(binding => !sourceIds.includes(binding.id))) throw new functions.https.HttpsError('failed-precondition', 'STATE_SOURCE_SET_INCOMPLETE')
      authorityBindings[claim.ref.path] = { itemDigest: lifeItemDigest(claim), sourceBindingDigest: lifeAuthorityDigest(current) }
    }
    for (const edge of relationships) {
      if (!edge.exists || edge.get('ownerId') !== uid || edge.get('synthetic') === true
        || edge.get('status') !== 'accepted' || ![edge.get('fromEntityId'),edge.get('toEntityId')].includes(entityId)) {
        throw new functions.https.HttpsError('failed-precondition', 'STATE_RELATIONSHIP_AUTHORITY_UNAVAILABLE')
      }
      const current = await requireLifeItemSources(db, transaction, uid, edge.data() ?? {}, 'sourceIds')
      if (current.some(binding => !sourceIds.includes(binding.id))) throw new functions.https.HttpsError('failed-precondition', 'STATE_SOURCE_SET_INCOMPLETE')
      authorityBindings[edge.ref.path] = { itemDigest: lifeItemDigest(edge), sourceBindingDigest: lifeAuthorityDigest(current) }
    }
    for (const constraint of negativeConstraints) {
      if (constraint.sourceIds.some((sourceId: string) => !sourceIds.includes(sourceId))) throw new functions.https.HttpsError('failed-precondition', 'STATE_SOURCE_SET_INCOMPLETE')
      await readLifeSourceBindings(db, transaction, uid, constraint.sourceIds)
    }
    transaction.set(db.doc(`users/${uid}/lifeEntityStates/${id}`), {
      id, ownerId: uid, entityId, asOf, claimIds, relationshipContextIds, sourceIds,
      negativeConstraints, knowledgeCutoff, sourceBindingDigest: lifeAuthorityDigest(bindings),
      authorityBindings, updatedAt: fieldValue.serverTimestamp(),
    })
  })
  await invalidateDependency(uid, id, `state-update:${id}`)
  return { id, entityId, claimCount: claimIds.length }
})

export const compilePersonModelBundle = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const personId = requireToken(data?.personId, 'personId')
  const stateId = requireToken(data?.stateId, 'stateId')
  return db.runTransaction(async (transaction) => {
  await requireModelConsent(uid, transaction)
  const [person, state] = await Promise.all([
    transaction.get(db.doc(`users/${uid}/lifeEntities/${personId}`)),
    transaction.get(db.doc(`users/${uid}/lifeEntityStates/${stateId}`)),
  ])
  if (!person.exists || person.get('ownerId') !== uid || person.get('kind') !== 'person' || person.get('revoked') === true) {
    throw new functions.https.HttpsError('failed-precondition', 'Person is unavailable.')
  }
  if (!state.exists || state.get('ownerId') !== uid || state.get('entityId') !== personId) {
    throw new functions.https.HttpsError('failed-precondition', 'Temporal person state is unavailable.')
  }
  await requireLifeItemSources(db, transaction, uid, person.data() ?? {}, 'createdFromSourceIds')
  const stateBindings = await requireLifeItemSources(db, transaction, uid, state.data() ?? {}, 'sourceIds')
  const claimIds = tokenArray(state.get('claimIds'), MAX_CLAIMS_PER_STATE)
  const authorityBindings: Record<string, unknown> = {
    [person.ref.path]: { itemDigest: lifeItemDigest(person) },
    [state.ref.path]: { itemDigest: lifeItemDigest(state), sourceBindingDigest: lifeAuthorityDigest(stateBindings) },
  }
  const claimRefs = claimIds.map((id: string) => db.doc(`users/${uid}/lifeClaims/${id}`))
  const claims = claimRefs.length ? await transaction.getAll(...claimRefs) : []
  const acceptedClaimIds: string[] = []
  const sourceIds = new Set<string>(Array.isArray(state.get('sourceIds')) ? state.get('sourceIds') : [])
  let unknownClaims = 0
  let disputedClaims = 0
  for (const claim of claims) {
    if (!claim.exists || claim.get('ownerId') !== uid || claim.get('subjectEntityId') !== personId
      || !['accepted','disputed'].includes(String(claim.get('status')))) {
      throw new functions.https.HttpsError('failed-precondition', 'PERSON_CLAIM_AUTHORITY_UNAVAILABLE')
    }
    const bindings = await requireLifeItemSources(db, transaction, uid, claim.data() ?? {}, 'sourceIds')
    const binding = { itemDigest: lifeItemDigest(claim), sourceBindingDigest: lifeAuthorityDigest(bindings) }
    if (lifeAuthorityDigest(state.get('authorityBindings')?.[claim.ref.path]) !== lifeAuthorityDigest(binding)) {
      throw new functions.https.HttpsError('failed-precondition', 'PERSON_STATE_DEPENDENCY_CHANGED')
    }
    authorityBindings[claim.ref.path] = binding
    if (claim.get('synthetic') === true) {
      throw new functions.https.HttpsError('failed-precondition', 'SYNTHETIC_HISTORICAL_CLAIM_DETECTED')
    }
    const status = String(claim.get('status') ?? '')
    const evidenceClass = String(claim.get('evidenceClass') ?? 'UNKNOWN')
    if (status === 'disputed') disputedClaims += 1
    if (status === 'accepted' && evidenceClass === 'UNKNOWN') unknownClaims += 1
    if (status === 'accepted' && evidenceClass !== 'UNKNOWN') acceptedClaimIds.push(claim.id)
    for (const sourceId of Array.isArray(claim.get('sourceIds')) ? claim.get('sourceIds') : []) sourceIds.add(String(sourceId))
  }

  const relationshipIds = optionalTokenArray(state.get('relationshipContextIds'), 128)
  const relationships = relationshipIds.length ? await transaction.getAll(...relationshipIds.map(id => db.doc(`users/${uid}/lifeCausalEdges/${id}`))) : []
  for (const edge of relationships) {
    if (!edge.exists || edge.get('ownerId') !== uid || edge.get('synthetic') === true || edge.get('status') !== 'accepted'
      || ![edge.get('fromEntityId'),edge.get('toEntityId')].includes(personId)) {
      throw new functions.https.HttpsError('failed-precondition', 'PERSON_RELATIONSHIP_UNAVAILABLE')
    }
    const bindings = await requireLifeItemSources(db, transaction, uid, edge.data() ?? {}, 'sourceIds')
    const current = { itemDigest: lifeItemDigest(edge), sourceBindingDigest: lifeAuthorityDigest(bindings) }
    if (lifeAuthorityDigest(state.get('authorityBindings')?.[edge.ref.path]) !== lifeAuthorityDigest(current)) {
      throw new functions.https.HttpsError('failed-precondition', 'PERSON_STATE_DEPENDENCY_CHANGED')
    }
    authorityBindings[edge.ref.path] = current
  }
  for (const constraint of Array.isArray(state.get('negativeConstraints')) ? state.get('negativeConstraints') : []) {
    await readLifeSourceBindings(db, transaction, uid, constraint.sourceIds)
  }
  const dependencyIds = [...new Set([personId, stateId, ...claimIds, ...relationshipIds, ...sourceIds])]
  const bundleBody = {
    schemaVersion: 'urai-life-model-v1',
    ownerId: uid,
    personId,
    stateId,
    asOf: String(state.get('asOf') ?? ''),
    knowledgeCutoff: state.get('knowledgeCutoff') ?? null,
    relationshipContextIds: state.get('relationshipContextIds') ?? [],
    acceptedClaimIds,
    negativeConstraints: state.get('negativeConstraints') ?? [],
    sourceIds: [...sourceIds],
    evidenceCoverage: { acceptedClaims: acceptedClaimIds.length, unknownClaims, disputedClaims },
    dependencyIds,
    synthetic: false,
    authorityBindings,
  }
  const bundleHash = stableDigest(bundleBody)
  const bundleId = requireToken(data?.bundleId ?? `person-model:${personId}:${stateId}`, 'bundleId')
  transaction.set(db.doc(`users/${uid}/personModelBundles/${bundleId}`), {
    id: bundleId,
    ...bundleBody,
    bundleHash,
    state: 'current',
    compiledAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  return { bundleId, bundleHash, evidenceCoverage: bundleBody.evidenceCoverage }
  })
})


async function requireCurrentPersonBundle(uid: string, bundle: FirebaseFirestore.DocumentSnapshot, transaction: FirebaseFirestore.Transaction) {
  const row = bundle.data() ?? {}
  if (!bundle.exists || row.ownerId !== uid || row.schemaVersion !== 'urai-life-model-v1'
    || row.state !== 'current' || row.synthetic !== false || !isRecord(row.authorityBindings)) {
    throw new functions.https.HttpsError('failed-precondition', 'PERSON_CURRENT_AUTHORITY_REQUIRED')
  }
  const paths = Object.keys(row.authorityBindings)
  if (!paths.length || paths.length > 514 || paths.some(path => !path.startsWith(`users/${uid}/`)
    || !/^users\/[^/]+\/(lifeEntities|lifeEntityStates|lifeClaims|lifeCausalEdges)\/[^/]+$/.test(path))) {
    throw new functions.https.HttpsError('failed-precondition', 'PERSON_DEPENDENCY_SCOPE_INVALID')
  }
  const dependencies = await transaction.getAll(...paths.map(path => db.doc(path)))
  for (const item of dependencies) {
    const body = item.data() ?? {}, expected = row.authorityBindings[item.ref.path]
    if (!item.exists || body.ownerId !== uid || body.revoked === true || body.synthetic === true
      || body.status === 'superseded' || !isRecord(expected) || expected.itemDigest !== lifeItemDigest(item)) {
      throw new functions.https.HttpsError('failed-precondition', 'PERSON_DEPENDENCY_CHANGED')
    }
    const field = item.ref.path.includes('/lifeEntities/') ? 'createdFromSourceIds' : 'sourceIds'
    const bindings = await requireLifeItemSources(db, transaction, uid, body, field)
    if (expected.sourceBindingDigest && expected.sourceBindingDigest !== lifeAuthorityDigest(bindings)) {
      throw new functions.https.HttpsError('failed-precondition', 'PERSON_DEPENDENCY_SOURCE_CHANGED')
    }
    if (item.ref.path.includes('/lifeEntityStates/')) {
      for (const constraint of Array.isArray(body.negativeConstraints) ? body.negativeConstraints : []) {
        await readLifeSourceBindings(db, transaction, uid, constraint.sourceIds)
      }
    }
  }
}

export const compileSceneTruthPacket = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const sceneId = requireToken(data?.sceneId, 'sceneId')
  const graphSnapshotId = requireToken(data?.graphSnapshotId, 'graphSnapshotId')
  const presentationClass = String(data?.presentationClass ?? '')
  if (!PRESENTATION_CLASSES.has(presentationClass)) {
    throw new functions.https.HttpsError('invalid-argument', 'Presentation class is invalid.')
  }

  const personModelBundleIds = optionalTokenArray(data?.personModelBundleIds, 64)
  const knownClaimIds = optionalTokenArray(data?.knownClaimIds, 256)
  const sourceIds = tokenArray(data?.sourceIds, 256)
  const unknowns = boundedStringArray(data?.unknowns, 128)
  const contradictions = boundedStringArray(data?.contradictions, 128)
  const criticalUnknowns = boundedStringArray(data?.criticalUnknowns, 128)
  const forbiddenAssertions = boundedStringArray(data?.forbiddenAssertions, 128)

  return db.runTransaction(async (transaction) => {
  await requireModelConsent(uid, transaction)
  const [graphSnapshot, bundles, claims] = await Promise.all([
    transaction.get(db.doc(`users/${uid}/lifeGraphSnapshots/${graphSnapshotId}`)),
    personModelBundleIds.length
      ? transaction.getAll(...personModelBundleIds.map((id) => db.doc(`users/${uid}/personModelBundles/${id}`)))
      : [],
    knownClaimIds.length
      ? transaction.getAll(...knownClaimIds.map((id) => db.doc(`users/${uid}/lifeClaims/${id}`)))
      : [],
  ])
  if (
    !graphSnapshot.exists
    || graphSnapshot.get('ownerId') !== uid
    || graphSnapshot.get('schemaVersion') !== 'urai-life-model-v1'
    || graphSnapshot.get('state') !== 'current'
    || graphSnapshot.get('syntheticOutputMayBecomeHistoricalSource') !== false
  ) throw new functions.https.HttpsError('failed-precondition', 'Current Life Causal Graph snapshot is required.')

  const graphEntities = tokenArray(graphSnapshot.get('entityIds'), 512)
  const graphClaims = optionalTokenArray(graphSnapshot.get('claimIds'), 1024)
  const graphEdges = optionalTokenArray(graphSnapshot.get('edgeIds'), 1024)
  const graphSourceIds = tokenArray(graphSnapshot.get('sourceIds'), 256)
  const expected = graphSnapshot.get('authorityBindings')
  if (!isRecord(expected) || !graphEntities.length) throw new functions.https.HttpsError('failed-precondition', 'GRAPH_CONTENT_BINDING_REQUIRED')
  const refs = [
    ...graphEntities.map(id => db.doc(`users/${uid}/lifeEntities/${id}`)),
    ...graphClaims.map(id => db.doc(`users/${uid}/lifeClaims/${id}`)),
    ...graphEdges.map(id => db.doc(`users/${uid}/lifeCausalEdges/${id}`)),
  ]
  const dependencies = await transaction.getAll(...refs)
  for (const item of dependencies) {
    if (!item.exists || item.get('ownerId') !== uid || item.get('revoked') === true || item.get('synthetic') === true
      || ['superseded','revoked'].includes(String(item.get('status')))) throw new functions.https.HttpsError('failed-precondition', 'GRAPH_DEPENDENCY_UNAVAILABLE')
    const field = item.ref.parent.id === 'lifeEntities' ? 'createdFromSourceIds' : 'sourceIds'
    const bindings = await requireLifeItemSources(db, transaction, uid, item.data() ?? {}, field)
    const current = { itemDigest: lifeItemDigest(item), sourceBindingDigest: lifeAuthorityDigest(bindings) }
    if (lifeAuthorityDigest(expected[item.ref.path]) !== lifeAuthorityDigest(current)) throw new functions.https.HttpsError('failed-precondition', 'GRAPH_DEPENDENCY_CHANGED')
  }
  if (knownClaimIds.some(id => !graphClaims.includes(id)) || sourceIds.some(id => !graphSourceIds.includes(id))) {
    throw new functions.https.HttpsError('failed-precondition', 'SCENE_GRAPH_LINEAGE_MISMATCH')
  }
  const dependencyIds = new Set<string>([graphSnapshotId, ...personModelBundleIds, ...knownClaimIds, ...graphSourceIds, ...sourceIds])

  for (const dependency of Array.isArray(graphSnapshot.get('dependencyIds')) ? graphSnapshot.get('dependencyIds') : []) {
    dependencyIds.add(String(dependency))
  }
  for (const bundle of bundles) {
    await requireCurrentPersonBundle(uid, bundle, transaction)
    if (
      !bundle.exists
      || bundle.get('ownerId') !== uid
      || bundle.get('schemaVersion') !== 'urai-life-model-v1'
      || bundle.get('state') !== 'current'
      || bundle.get('synthetic') !== false
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'Scene Person Model authority is unavailable.')
    }
    if (optionalTokenArray(bundle.get('acceptedClaimIds'), 256).some(id => !graphClaims.includes(id))
      || tokenArray(bundle.get('sourceIds'), 256).some(id => !graphSourceIds.includes(id))) {
      throw new functions.https.HttpsError('failed-precondition', 'SCENE_PERSON_GRAPH_LINEAGE_MISMATCH')
    }
    for (const dependency of Array.isArray(bundle.get('dependencyIds')) ? bundle.get('dependencyIds') : []) {
      dependencyIds.add(String(dependency))
    }
  }

  for (const claim of claims) {
    if (!claim.exists || claim.get('ownerId') !== uid || claim.get('synthetic') === true) {
      throw new functions.https.HttpsError('failed-precondition', 'Scene claim authority is unavailable.')
    }
    if (claim.get('status') !== 'accepted' || claim.get('evidenceClass') === 'UNKNOWN') {
      throw new functions.https.HttpsError('failed-precondition', 'Scene known claims must be accepted and evidence-backed.')
    }
    for (const sourceId of Array.isArray(claim.get('sourceIds')) ? claim.get('sourceIds') : []) {
      dependencyIds.add(String(sourceId))
    }
  }

  let decision: 'READY' | 'READY_WITH_OCCLUSION' | 'READY_INTERPRETIVE' | 'BLOCKED'
  if (contradictions.length || criticalUnknowns.length) decision = 'BLOCKED'
  else if (presentationClass === 'INTERPRETIVE') decision = 'READY_INTERPRETIVE'
  else if (unknowns.length) decision = 'READY_WITH_OCCLUSION'
  else decision = 'READY'

  if ((presentationClass === 'SIMULATED' || presentationClass === 'COUNTERFACTUAL') && decision === 'READY') {
    decision = 'READY_INTERPRETIVE'
  }

  const body = {
    schemaVersion: 'urai-life-model-v1',
    ownerId: uid,
    sceneId,
    graphSnapshotId,
    graphHash: graphSnapshot.get('graphHash'),
    presentationClass,
    personModelBundleIds,
    knownClaimIds,
    sourceIds,
    unknowns,
    contradictions,
    criticalUnknowns,
    forbiddenAssertions,
    decision,
    dependencyIds: [...dependencyIds],
    syntheticOutputMayBecomeHistoricalSource: false,
    state: 'current',
  }
  const packetHash = stableDigest(body)
  transaction.set(db.doc(`users/${uid}/sceneTruthPackets/${sceneId}`), {
    ...body,
    packetHash,
    compiledAt: fieldValue.serverTimestamp(),
    updatedAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  return { sceneId, decision, packetHash }
  })
})

export const applyLifeCorrection = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const correctionId = requireToken(data?.correctionId, 'correctionId')
  const targetClaimId = requireToken(data?.targetClaimId, 'targetClaimId')
  const replacementClaimId = requireToken(data?.replacementClaimId, 'replacementClaimId')
  const sourceIds = tokenArray(data?.sourceIds, 32)
  if (!sourceIds.length) throw new functions.https.HttpsError('invalid-argument', 'Correction source is required.')
  const evidenceClass = String(data?.evidenceClass ?? '')
  if (!['DIRECT_SUBJECT_TESTIMONY','ATTRIBUTED_TESTIMONY'].includes(evidenceClass)) {
    throw new functions.https.HttpsError('invalid-argument', 'Correction evidence class must be testimony.')
  }
  const confidence = String(data?.confidence ?? 'confirmed')
  if (!['confirmed','probable','approximate'].includes(confidence)) {
    throw new functions.https.HttpsError('invalid-argument', 'Correction confidence is invalid.')
  }
  const replacementValue = boundedJson(data?.replacementValue)
  const targetRef = db.doc(`users/${uid}/lifeClaims/${targetClaimId}`)
  const replacementRef = db.doc(`users/${uid}/lifeClaims/${replacementClaimId}`)
  const correctionRef = db.doc(`users/${uid}/lifeCorrections/${correctionId}`)
  if (replacementClaimId === targetClaimId) {
    throw new functions.https.HttpsError('invalid-argument', 'Correction replacement claim must have a new identity.')
  }

  await db.runTransaction(async (transaction) => {
    await requireModelConsent(uid, transaction)
    const correctionBindings = await readLifeSourceBindings(db, transaction, uid, sourceIds)
    if (correctionBindings.some(binding => binding.sourceEvidenceClass !== evidenceClass)) {
      throw new functions.https.HttpsError('failed-precondition', 'CORRECTION_TESTIMONY_SOURCE_REQUIRED')
    }
    const [target, existingCorrection, existingReplacement] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(correctionRef),
      transaction.get(replacementRef),
    ])
    if (!target.exists || target.get('ownerId') !== uid || target.get('synthetic') === true) {
      throw new functions.https.HttpsError('not-found', 'Target claim is unavailable.')
    }
    await requireLifeItemSources(db, transaction, uid, target.data() ?? {}, 'sourceIds')
    if (target.get('status') === 'superseded') {
      throw new functions.https.HttpsError('failed-precondition', 'Target claim was already superseded.')
    }
    if (existingCorrection.exists || existingReplacement.exists) {
      throw new functions.https.HttpsError('already-exists', 'Correction or replacement claim already exists.')
    }
    transaction.create(replacementRef, {
      id: replacementClaimId,
      ownerId: uid,
      subjectEntityId: target.get('subjectEntityId'),
      predicate: target.get('predicate'),
      value: replacementValue,
      evidenceClass,
      sourceIds,
      confidence,
      status: 'accepted',
      synthetic: false,
      valueDigest: stableDigest(replacementValue),
      sourceBindingDigest: lifeAuthorityDigest(correctionBindings),
      historicalSourceAuthority: false,
      syntheticOutputMayBecomeHistoricalSource: false,
      correctsClaimId: targetClaimId,
      correctionId,
      createdAt: fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    })
    transaction.create(correctionRef, {
      id: correctionId,
      ownerId: uid,
      targetClaimId,
      replacementClaimId,
      sourceIds,
      evidenceClass,
      confidence,
      note: data?.note ? requireString(data.note, 'note', 1000) : '',
      replacementValue,
      createdAt: fieldValue.serverTimestamp(),
    })
    transaction.set(targetRef, {
      status: 'superseded',
      supersededByCorrectionId: correctionId,
      supersededByClaimId: replacementClaimId,
      supersededAt: fieldValue.serverTimestamp(),
    }, { merge: true })
  })
  const invalidated = await invalidateDependency(uid, targetClaimId, `correction:${correctionId}`)
  return { correctionId, targetClaimId, replacementClaimId, invalidated }
})

export const revokeLifeEntity = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const entityId = requireToken(data?.entityId, 'entityId')
  const reasonId = requireToken(data?.reasonId, 'reasonId')
  const ref = db.doc(`users/${uid}/lifeEntities/${entityId}`)
  const entity = await ref.get()
  if (!entity.exists || entity.get('ownerId') !== uid) throw new functions.https.HttpsError('not-found', 'Entity is unavailable.')
  await ref.set({ revoked: true, revokedAt: fieldValue.serverTimestamp(), revocationReasonId: reasonId }, { merge: true })
  const invalidated = await invalidateDependency(uid, entityId, `revocation:${reasonId}`, true)
  return { entityId, revoked: true, invalidated }
})

export const getReplayLifeModelAuthority = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const memoryId = requireToken(data?.memoryId, 'memoryId')
  return db.runTransaction(async (transaction) => {
  await requireModelConsent(uid, transaction)
  const memory = await transaction.get(db.doc(`users/${uid}/memories/${memoryId}`))
  if (!memory.exists || (memory.get('ownerId') ?? memory.get('userId')) !== uid || memory.get('deleted') === true) {
    return { available: false, reason: 'MEMORY_UNAVAILABLE' }
  }
  const lifeMovie = isRecord(memory.get('lifeMovie')) ? memory.get('lifeMovie') as JsonMap : {}
  const sceneTruthPacketId = typeof lifeMovie.sceneTruthPacketId === 'string' ? lifeMovie.sceneTruthPacketId : ''
  const personModelBundleIds = Array.isArray(lifeMovie.personModelBundleIds)
    ? [...new Set(lifeMovie.personModelBundleIds.filter((value): value is string => typeof value === 'string' && SAFE_TOKEN.test(value)))]
    : []
  if (!SAFE_TOKEN.test(sceneTruthPacketId)) {
    return { available: false, reason: 'SCENE_TRUTH_REQUIRED' }
  }
  const [scene, bundles] = await Promise.all([
    transaction.get(db.doc(`users/${uid}/sceneTruthPackets/${sceneTruthPacketId}`)),
    personModelBundleIds.length
      ? transaction.getAll(...personModelBundleIds.map((id) => db.doc(`users/${uid}/personModelBundles/${id}`)))
      : [],
  ])
  if (
    !scene.exists
    || scene.get('ownerId') !== uid
    || scene.get('schemaVersion') !== 'urai-life-model-v1'
    || scene.get('state') !== 'current'
    || scene.get('syntheticOutputMayBecomeHistoricalSource') !== false
    || !['READY','READY_WITH_OCCLUSION','READY_INTERPRETIVE'].includes(String(scene.get('decision') ?? ''))
  ) {
    return { available: false, reason: 'SCENE_TRUTH_UNAVAILABLE' }
  }
  if (!bundles.every((bundle) =>
    bundle.exists
    && bundle.get('ownerId') === uid
    && bundle.get('schemaVersion') === 'urai-life-model-v1'
    && bundle.get('state') === 'current'
    && bundle.get('synthetic') === false
  )) {
    return { available: false, reason: 'PERSON_MODEL_UNAVAILABLE' }
  }
  for (const bundle of bundles) await requireCurrentPersonBundle(uid, bundle, transaction)
  const personIds = [...new Set(bundles.map((bundle) => String(bundle.get('personId') ?? '')).filter((id) => SAFE_TOKEN.test(id)))]
  const personSnapshots = personIds.length
    ? await transaction.getAll(...personIds.map((id) => db.doc(`users/${uid}/lifeEntities/${id}`)))
    : []
  const labels = new Map(personSnapshots
    .filter((person) => person.exists && person.get('ownerId') === uid && person.get('kind') === 'person' && person.get('revoked') !== true)
    .map((person) => [person.id, String(person.get('canonicalLabel') ?? 'Person').slice(0, 180)]))
  const people = bundles.flatMap((bundle) => {
    const personId = String(bundle.get('personId') ?? '')
    const label = labels.get(personId)
    return label ? [{
      bundleId: bundle.id,
      personId,
      label,
      asOf: String(bundle.get('asOf') ?? ''),
      knowledgeCutoff: typeof bundle.get('knowledgeCutoff') === 'string' ? bundle.get('knowledgeCutoff') : null,
    }] : []
  })
  return {
    available: true,
    schemaVersion: 'urai-life-model-v1',
    sceneTruthPacketId,
    personModelBundleIds,
    people,
    decision: String(scene.get('decision')),
    presentationClass: String(scene.get('presentationClass')),
    syntheticOutputMayBecomeHistoricalSource: false,
  }
  })
})

