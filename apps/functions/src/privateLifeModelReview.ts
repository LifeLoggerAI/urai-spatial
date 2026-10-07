import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const lifeModelReviewFunctions = functions.region('us-central1')
const fieldValue = admin.firestore.FieldValue
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,160}$/
const HANDLE_HASH = /^[a-f0-9]{40}$/
const SHA256 = /^[a-f0-9]{64}$/
const EVIDENCE_CLASSES = new Set([
  'SOURCE_CAPTURED','SOURCE_DERIVED','DIRECT_SUBJECT_TESTIMONY',
  'ATTRIBUTED_TESTIMONY','CORROBORATED_INFERENCE','CONTEXTUAL_RESEARCH',
])
const CONFIDENCE = new Set(['confirmed','probable','approximate'])
const EDGE_KINDS = new Set([
  'PARTICIPATED_IN','OCCURRED_AT','INVOLVES_OBJECT','RELATES_TO','CAUSED',
  'CHANGED','EVIDENCED_BY','BEFORE','AFTER','OWNED','LIVED_AT',
])
const MAX_REVIEW_ITEMS = 100

type JsonMap = Record<string, unknown>
type ClaimDecision = { id: string; evidenceClass: string; confidence: string }
type RelationshipDecision = { index: number; kind: string; confidence: string }

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

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as JsonMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => JSON.stringify(key) + ':' + canonicalJson(val))
    return '{' + entries.join(',') + '}'
  }
  return JSON.stringify(value) as string
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function decisionDigest(value: unknown) {
  return sha256(canonicalJson(value))
}

function requireEntityIds(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_REVIEW_ITEMS) {
    throw new functions.https.HttpsError('invalid-argument', 'Entity review selection is invalid.')
  }
  return [...new Set(value.map((entry) => requireToken(entry, 'entityId')))]
}

function requireClaimDecisions(value: unknown): ClaimDecision[] {
  if (!Array.isArray(value) || value.length > MAX_REVIEW_ITEMS) {
    throw new functions.https.HttpsError('invalid-argument', 'Claim review selection is invalid.')
  }
  const output = value.map((entry) => {
    if (!isRecord(entry)) throw new functions.https.HttpsError('invalid-argument', 'Claim decision is invalid.')
    const id = requireToken(entry.id, 'claimId')
    const evidenceClass = String(entry.evidenceClass ?? '')
    const confidence = String(entry.confidence ?? '')
    if (!EVIDENCE_CLASSES.has(evidenceClass) || !CONFIDENCE.has(confidence)) {
      throw new functions.https.HttpsError('invalid-argument', 'Claim evidence review is invalid.')
    }
    return { id, evidenceClass, confidence }
  })
  if (new Set(output.map((entry) => entry.id)).size !== output.length) {
    throw new functions.https.HttpsError('invalid-argument', 'Claim review contains duplicates.')
  }
  return output
}

function requireRelationshipDecisions(value: unknown): RelationshipDecision[] {
  if (!Array.isArray(value) || value.length > MAX_REVIEW_ITEMS) {
    throw new functions.https.HttpsError('invalid-argument', 'Relationship review selection is invalid.')
  }
  const output = value.map((entry) => {
    if (!isRecord(entry)) throw new functions.https.HttpsError('invalid-argument', 'Relationship decision is invalid.')
    const index = Number(entry.index)
    const kind = String(entry.kind ?? '')
    const confidence = String(entry.confidence ?? '')
    if (!Number.isSafeInteger(index) || index < 0 || !EDGE_KINDS.has(kind) || !CONFIDENCE.has(confidence)) {
      throw new functions.https.HttpsError('invalid-argument', 'Relationship review is invalid.')
    }
    return { index, kind, confidence }
  })
  if (new Set(output.map((entry) => entry.index)).size !== output.length) {
    throw new functions.https.HttpsError('invalid-argument', 'Relationship review contains duplicates.')
  }
  return output
}

function sourceIds(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) {
    throw new functions.https.HttpsError('failed-precondition', 'Candidate source lineage is invalid.')
  }
  const values = value.map((entry) => requireToken(entry, 'sourceId'))
  return [...new Set(values)]
}

function candidateMap(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length > 256) {
    throw new functions.https.HttpsError('failed-precondition', `${label} candidate set is invalid.`)
  }
  return value
}

function requireCurrentModelConsent(policy: FirebaseFirestore.DocumentSnapshot) {
  if (!policy.exists) throw new functions.https.HttpsError('failed-precondition', 'CONSENT_POLICY_REQUIRED')
  const data = policy.data() ?? {}
  const domains = isRecord(data.domains) ? data.domains : {}
  const models = isRecord(domains.models) ? domains.models : {}
  const identity = isRecord(domains.identity) ? domains.identity : {}
  const enforcement = isRecord(data.enforcement) ? data.enforcement : {}
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

/**
 * Promotes only explicitly owner-reviewed portions of one exact quarantined
 * private Life Model revision. The Jobs extraction remains inert by default:
 * no candidate can become historical truth without this separate authenticated
 * review action and a current consent/fixity check.
 */
export const reviewPrivateLifeModelCandidate = lifeModelReviewFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const handleHash = String(data?.handleHash ?? '').trim()
  const revision = Number(data?.revision)
  const checksum = String(data?.checksum ?? '').trim().toLowerCase()
  const reviewId = requireToken(data?.reviewId, 'reviewId')
  if (!HANDLE_HASH.test(handleHash) || !Number.isSafeInteger(revision) || revision < 1 || !SHA256.test(checksum)) {
    throw new functions.https.HttpsError('invalid-argument', 'Private Life Model revision identity is invalid.')
  }

  const entitiesToAccept = requireEntityIds(data?.entities ?? [])
  const claimDecisions = requireClaimDecisions(data?.claims ?? [])
  const relationshipDecisions = requireRelationshipDecisions(data?.relationships ?? [])
  if (!entitiesToAccept.length && !claimDecisions.length && !relationshipDecisions.length) {
    throw new functions.https.HttpsError('invalid-argument', 'At least one reviewed item is required.')
  }

  const requestedDecision = {
    schemaVersion: 'urai-private-life-model-owner-review-v1',
    handleHash,
    revision,
    checksum,
    reviewId,
    entities: [...entitiesToAccept].sort(),
    claims: [...claimDecisions].sort((a, b) => a.id.localeCompare(b.id)),
    relationships: [...relationshipDecisions].sort((a, b) => a.index - b.index),
  }
  const reviewDigest = decisionDigest(requestedDecision)
  const root = db.collection('uraiPrivateLifeModel').doc(handleHash)
  const revisionRef = root.collection('revisions').doc(String(revision).padStart(8, '0'))
  const currentRef = root.collection('state').doc('current')
  const fenceRef = db.collection('uraiPrivateLifeModelOwnerFences').doc(sha256(uid))
  const policyRef = db.doc(`users/${uid}/privacyPolicy/current`)
  const receiptRef = db.doc(`users/${uid}/lifeModelReceipts/${reviewId}`)
  const auditRef = db.collection(`users/${uid}/privacyAudit`).doc()

  return db.runTransaction(async (transaction) => {
    const [revisionSnapshot, currentSnapshot, fenceSnapshot, policySnapshot, priorReceipt] = await Promise.all([
      transaction.get(revisionRef),
      transaction.get(currentRef),
      transaction.get(fenceRef),
      transaction.get(policyRef),
      transaction.get(receiptRef),
    ])

    if (priorReceipt.exists) {
      if (
        priorReceipt.get('ownerId') !== uid
        || priorReceipt.get('kind') !== 'private-index-owner-review'
        || priorReceipt.get('reviewDigest') !== reviewDigest
        || priorReceipt.get('sourceChecksum') !== checksum
      ) {
        throw new functions.https.HttpsError('already-exists', 'Review identity is already bound to different decisions.')
      }
      return {
        reviewId,
        replayed: true,
        entityCount: Number(priorReceipt.get('entityCount') ?? 0),
        claimCount: Number(priorReceipt.get('claimCount') ?? 0),
        relationshipCount: Number(priorReceipt.get('relationshipCount') ?? 0),
      }
    }

    requireCurrentModelConsent(policySnapshot)
    if (fenceSnapshot.exists && fenceSnapshot.get('deleted') === true) {
      throw new functions.https.HttpsError('failed-precondition', 'PRIVATE_LIFE_MODEL_OWNER_DELETED')
    }
    if (!revisionSnapshot.exists || !currentSnapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Private Life Model revision is unavailable.')
    }

    const revisionData = revisionSnapshot.data() ?? {}
    if (
      revisionData.ownerUid !== uid
      || revisionData.schemaVersion !== 'urai-life-model-v1'
      || revisionData.reviewState !== 'OWNER_REVIEW_REQUIRED'
      || revisionData.historicalSourceAuthority !== false
      || revisionData.syntheticOutputMayBecomeHistoricalSource !== false
      || revisionData.checksum !== checksum
      || revisionData.backlogState !== 'QUARANTINED_OWNER_REVIEW'
      || currentSnapshot.get('ownerUid') !== uid
      || currentSnapshot.get('revision') !== revision
      || currentSnapshot.get('checksum') !== checksum
      || currentSnapshot.get('reviewState') !== 'OWNER_REVIEW_REQUIRED'
      || currentSnapshot.get('historicalSourceAuthority') !== false
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'Private Life Model revision is stale, conflicted, or not reviewable.')
    }

    const { checksum: _checksum, backlogState: _backlogState, createdAt: _createdAt, ...retained } = revisionData
    if (sha256(canonicalJson(retained)) !== checksum) {
      throw new functions.https.HttpsError('failed-precondition', 'PRIVATE_LIFE_MODEL_REVISION_FIXITY_MISMATCH')
    }

    const importCandidate = isRecord(revisionData.importCandidate) ? revisionData.importCandidate : null
    if (
      !importCandidate
      || importCandidate.schemaVersion !== 'urai-spatial-owner-review-import-candidate-v1'
      || importCandidate.ownerId !== uid
      || importCandidate.reviewState !== 'OWNER_REVIEW_REQUIRED'
      || importCandidate.importExecutable !== false
      || importCandidate.historicalSourceAuthority !== false
      || importCandidate.lineageSha256 !== sha256(canonicalJson(importCandidate.lineage))
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'Private Life Model import candidate is invalid.')
    }

    const entityCandidates = candidateMap(importCandidate.entities, 'Entity')
    const claimCandidates = candidateMap(importCandidate.claims, 'Claim')
    const relationshipCandidates = candidateMap(importCandidate.relationships, 'Relationship')
    const entityById = new Map<string, JsonMap>()
    for (const raw of entityCandidates) {
      if (!isRecord(raw)) throw new functions.https.HttpsError('failed-precondition', 'Entity candidate is invalid.')
      const id = requireToken(raw.id, 'entityId')
      if (
        raw.ownerId !== uid
        || raw.reviewState !== 'QUARANTINED'
        || !['person','place','object','event','organization','statement'].includes(String(raw.kind ?? ''))
      ) throw new functions.https.HttpsError('failed-precondition', 'Entity candidate authority is invalid.')
      entityById.set(id, raw)
    }

    const acceptedEntityIds = new Set(entitiesToAccept)
    for (const id of acceptedEntityIds) {
      if (!entityById.has(id)) throw new functions.https.HttpsError('invalid-argument', 'Reviewed entity is not in the exact candidate.')
    }

    const claimById = new Map<string, JsonMap>()
    for (const raw of claimCandidates) {
      if (!isRecord(raw)) throw new functions.https.HttpsError('failed-precondition', 'Claim candidate is invalid.')
      const id = requireToken(raw.id, 'claimId')
      if (
        raw.ownerId !== uid
        || raw.reviewState !== 'QUARANTINED'
        || raw.synthetic !== true
        || raw.evidenceClass !== 'UNKNOWN'
        || raw.confidence !== 'unknown'
        || raw.status !== 'disputed'
      ) throw new functions.https.HttpsError('failed-precondition', 'Claim candidate quarantine is invalid.')
      claimById.set(id, raw)
    }

    const sourceEvidenceClass = String(revisionData.sourceEvidenceClass ?? '')
    const claimWrites: Array<{ decision: ClaimDecision; candidate: JsonMap }> = []
    for (const decision of claimDecisions) {
      const candidate = claimById.get(decision.id)
      if (!candidate) throw new functions.https.HttpsError('invalid-argument', 'Reviewed claim is not in the exact candidate.')
      const proposed = String(candidate.proposedEvidenceClass ?? '')
      if (
        decision.evidenceClass !== proposed
        || (decision.evidenceClass !== sourceEvidenceClass && decision.evidenceClass !== 'CORROBORATED_INFERENCE')
      ) {
        throw new functions.https.HttpsError('failed-precondition', 'Reviewed claim attempts unsupported evidence promotion.')
      }
      const subjectEntityId = requireToken(candidate.subjectEntityId, 'subjectEntityId')
      if (!acceptedEntityIds.has(subjectEntityId)) {
        throw new functions.https.HttpsError('failed-precondition', 'Reviewed claim requires its candidate entity in the same review.')
      }
      claimWrites.push({ decision, candidate })
    }

    const relationshipWrites: Array<{ decision: RelationshipDecision; candidate: JsonMap; id: string }> = []
    for (const decision of relationshipDecisions) {
      const candidate = relationshipCandidates[decision.index]
      if (!isRecord(candidate)) throw new functions.https.HttpsError('invalid-argument', 'Reviewed relationship is not in the exact candidate.')
      if (
        candidate.ownerId !== uid
        || candidate.reviewState !== 'QUARANTINED'
        || candidate.synthetic !== true
        || candidate.evidenceClass !== 'UNKNOWN'
        || candidate.confidence !== 'unknown'
        || candidate.status !== 'disputed'
      ) throw new functions.https.HttpsError('failed-precondition', 'Relationship candidate quarantine is invalid.')
      const fromEntityId = requireToken(candidate.fromEntityId, 'fromEntityId')
      const toEntityId = requireToken(candidate.toEntityId, 'toEntityId')
      if (!acceptedEntityIds.has(fromEntityId) || !acceptedEntityIds.has(toEntityId)) {
        throw new functions.https.HttpsError('failed-precondition', 'Reviewed relationship requires both candidate entities in the same review.')
      }
      if (!EVIDENCE_CLASSES.has(sourceEvidenceClass)) {
        throw new functions.https.HttpsError('failed-precondition', 'Relationship source evidence is not promotable.')
      }
      const id = requireToken(`candidate-edge:${handleHash.slice(0, 20)}:${revision}:${decision.index}`, 'edgeId')
      relationshipWrites.push({ decision, candidate, id })
    }

    const entityRefs = entitiesToAccept.map((id) => db.doc(`users/${uid}/lifeEntities/${id}`))
    const claimRefs = claimWrites.map(({ decision }) => db.doc(`users/${uid}/lifeClaims/${decision.id}`))
    const edgeRefs = relationshipWrites.map(({ id }) => db.doc(`users/${uid}/lifeCausalEdges/${id}`))
    const existing = await Promise.all([...entityRefs, ...claimRefs, ...edgeRefs].map((ref) => transaction.get(ref)))
    if (existing.some((snapshot) => snapshot.exists)) {
      throw new functions.https.HttpsError('already-exists', 'Reviewed canonical target already exists; use correction or a new review revision.')
    }

    const now = fieldValue.serverTimestamp()
    for (const id of entitiesToAccept) {
      const candidate = entityById.get(id)!
      transaction.create(db.doc(`users/${uid}/lifeEntities/${id}`), {
        id,
        ownerId: uid,
        kind: String(candidate.kind),
        canonicalLabel: String(candidate.canonicalLabel ?? '').slice(0, 180),
        aliases: Array.isArray(candidate.aliases) ? candidate.aliases.slice(0, 24).map(String) : [],
        createdFromSourceIds: sourceIds(candidate.createdFromSourceIds),
        privateLifeModelReviewId: reviewId,
        privateLifeModelRevision: revision,
        privateLifeModelChecksum: checksum,
        revoked: false,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      })
    }

    for (const { decision, candidate } of claimWrites) {
      const value = candidate.value
      const encoded = JSON.stringify(value)
      if (encoded === undefined || Buffer.byteLength(encoded, 'utf8') > 8192) {
        throw new functions.https.HttpsError('failed-precondition', 'Reviewed claim value is invalid.')
      }
      transaction.create(db.doc(`users/${uid}/lifeClaims/${decision.id}`), {
        id: decision.id,
        ownerId: uid,
        subjectEntityId: requireToken(candidate.subjectEntityId, 'subjectEntityId'),
        predicate: requireToken(candidate.predicate, 'predicate'),
        value,
        evidenceClass: decision.evidenceClass,
        sourceIds: sourceIds(candidate.sourceIds),
        confidence: decision.confidence,
        status: 'accepted',
        synthetic: false,
        valueDigest: sha256(encoded),
        privateLifeModelReviewId: reviewId,
        privateLifeModelRevision: revision,
        privateLifeModelChecksum: checksum,
        createdAt: now,
        updatedAt: now,
      })
    }

    for (const { decision, candidate, id } of relationshipWrites) {
      transaction.create(db.doc(`users/${uid}/lifeCausalEdges/${id}`), {
        id,
        ownerId: uid,
        fromEntityId: requireToken(candidate.fromEntityId, 'fromEntityId'),
        toEntityId: requireToken(candidate.toEntityId, 'toEntityId'),
        kind: decision.kind,
        evidenceClass: sourceEvidenceClass,
        sourceIds: sourceIds(candidate.sourceIds),
        confidence: decision.confidence,
        status: 'accepted',
        synthetic: false,
        privateLifeModelReviewId: reviewId,
        privateLifeModelRevision: revision,
        privateLifeModelChecksum: checksum,
        createdAt: now,
        updatedAt: now,
      })
    }

    const result = {
      reviewId,
      replayed: false,
      entityCount: entitiesToAccept.length,
      claimCount: claimWrites.length,
      relationshipCount: relationshipWrites.length,
    }
    transaction.create(receiptRef, {
      id: reviewId,
      ownerId: uid,
      kind: 'private-index-owner-review',
      schemaVersion: 'urai-private-life-model-owner-review-v1',
      sourceHandleHash: handleHash,
      sourceRevision: revision,
      sourceChecksum: checksum,
      reviewDigest,
      historicalSourceAuthority: 'owner-reviewed-canonical-write',
      syntheticOutputMayBecomeHistoricalSource: false,
      entityCount: result.entityCount,
      claimCount: result.claimCount,
      relationshipCount: result.relationshipCount,
      createdAt: now,
    })
    transaction.create(auditRef, {
      ownerId: uid,
      kind: 'life_model.private_index_owner_reviewed',
      reviewId,
      sourceRevision: revision,
      sourceChecksum: checksum,
      entityCount: result.entityCount,
      claimCount: result.claimCount,
      relationshipCount: result.relationshipCount,
      recordedAt: now,
    })
    return result
  })
})
