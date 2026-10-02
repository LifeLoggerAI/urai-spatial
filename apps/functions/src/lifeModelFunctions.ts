import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

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
const MAX_CLAIMS_PER_STATE = 256
const MAX_DEPENDENCY_INVALIDATIONS = 100

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

async function requireModelConsent(uid: string) {
  const snapshot = await db.doc(`users/${uid}/privacyPolicy/current`).get()
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
  const collections = ['personModelBundles','sceneTruthPackets','renderManifests','lifeMovies']
  const batch = db.batch()
  let count = 0
  for (const collection of collections) {
    const snapshot = await db.collection(`users/${uid}/${collection}`)
      .where('dependencyIds', 'array-contains', dependencyId)
      .limit(MAX_DEPENDENCY_INVALIDATIONS)
      .get()
    for (const doc of snapshot.docs) {
      batch.set(doc.ref, {
        state: revoked ? 'revoked' : 'invalidated',
        invalidatedBy: reasonId,
        invalidatedAt: fieldValue.serverTimestamp(),
      }, { merge: true })
      count += 1
    }
  }
  if (count) await batch.commit()
  return count
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

  const ref = db.doc(`users/${uid}/lifeEntities/${id}`)
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref)
    transaction.set(ref, {
      id,
      ownerId: uid,
      kind,
      canonicalLabel,
      aliases: [...new Set(aliases)],
      createdFromSourceIds,
      revoked: false,
      revision: Math.max(1, Number(current.get('revision') ?? 0) + 1),
      createdAt: current.exists ? current.get('createdAt') ?? fieldValue.serverTimestamp() : fieldValue.serverTimestamp(),
      updatedAt: fieldValue.serverTimestamp(),
    }, { merge: true })
  })
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
  const entity = await db.doc(`users/${uid}/lifeEntities/${subjectEntityId}`).get()
  if (!entity.exists || entity.get('ownerId') !== uid || entity.get('revoked') === true) {
    throw new functions.https.HttpsError('failed-precondition', 'Subject entity is unavailable.')
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
  await ref.set({
    ...payload,
    createdAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  await invalidateDependency(uid, id, `claim-update:${id}`)
  return { id, subjectEntityId, evidenceClass }
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

  const entity = await db.doc(`users/${uid}/lifeEntities/${entityId}`).get()
  if (!entity.exists || entity.get('ownerId') !== uid || entity.get('revoked') === true) {
    throw new functions.https.HttpsError('failed-precondition', 'Entity is unavailable.')
  }

  await db.doc(`users/${uid}/lifeEntityStates/${id}`).set({
    id, ownerId: uid, entityId, asOf, claimIds, relationshipContextIds, sourceIds,
    negativeConstraints,
    ...(knowledgeCutoff ? { knowledgeCutoff } : {}),
    updatedAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  await invalidateDependency(uid, id, `state-update:${id}`)
  return { id, entityId, claimCount: claimIds.length }
})

export const compilePersonModelBundle = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  await requireModelConsent(uid)
  const personId = requireToken(data?.personId, 'personId')
  const stateId = requireToken(data?.stateId, 'stateId')
  const [person, state] = await Promise.all([
    db.doc(`users/${uid}/lifeEntities/${personId}`).get(),
    db.doc(`users/${uid}/lifeEntityStates/${stateId}`).get(),
  ])
  if (!person.exists || person.get('ownerId') !== uid || person.get('kind') !== 'person' || person.get('revoked') === true) {
    throw new functions.https.HttpsError('failed-precondition', 'Person is unavailable.')
  }
  if (!state.exists || state.get('ownerId') !== uid || state.get('entityId') !== personId) {
    throw new functions.https.HttpsError('failed-precondition', 'Temporal person state is unavailable.')
  }
  const claimIds = Array.isArray(state.get('claimIds')) ? state.get('claimIds').slice(0, MAX_CLAIMS_PER_STATE) : []
  const claimRefs = claimIds.map((id: string) => db.doc(`users/${uid}/lifeClaims/${id}`))
  const claims = claimRefs.length ? await db.getAll(...claimRefs) : []
  const acceptedClaimIds: string[] = []
  const sourceIds = new Set<string>(Array.isArray(state.get('sourceIds')) ? state.get('sourceIds') : [])
  let unknownClaims = 0
  let disputedClaims = 0
  for (const claim of claims) {
    if (!claim.exists || claim.get('ownerId') !== uid || claim.get('subjectEntityId') !== personId) continue
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

  const dependencyIds = [...new Set([personId, stateId, ...claimIds])]
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
  }
  const bundleHash = stableDigest(bundleBody)
  const bundleId = requireToken(data?.bundleId ?? `person-model:${personId}:${stateId}`, 'bundleId')
  await db.doc(`users/${uid}/personModelBundles/${bundleId}`).set({
    id: bundleId,
    ...bundleBody,
    bundleHash,
    state: 'current',
    compiledAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  return { bundleId, bundleHash, evidenceCoverage: bundleBody.evidenceCoverage }
})

export const compileSceneTruthPacket = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  await requireModelConsent(uid)
  const sceneId = requireToken(data?.sceneId, 'sceneId')
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

  const [bundles, claims] = await Promise.all([
    personModelBundleIds.length
      ? db.getAll(...personModelBundleIds.map((id) => db.doc(`users/${uid}/personModelBundles/${id}`)))
      : [],
    knownClaimIds.length
      ? db.getAll(...knownClaimIds.map((id) => db.doc(`users/${uid}/lifeClaims/${id}`)))
      : [],
  ])

  const dependencyIds = new Set<string>([...personModelBundleIds, ...knownClaimIds])
  for (const bundle of bundles) {
    if (
      !bundle.exists
      || bundle.get('ownerId') !== uid
      || bundle.get('schemaVersion') !== 'urai-life-model-v1'
      || bundle.get('state') !== 'current'
      || bundle.get('synthetic') !== false
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'Scene Person Model authority is unavailable.')
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
  await db.doc(`users/${uid}/sceneTruthPackets/${sceneId}`).set({
    ...body,
    packetHash,
    compiledAt: fieldValue.serverTimestamp(),
    updatedAt: fieldValue.serverTimestamp(),
  }, { merge: true })
  return { sceneId, decision, packetHash }
})

export const applyLifeCorrection = lifeModelFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const correctionId = requireToken(data?.correctionId, 'correctionId')
  const targetClaimId = requireToken(data?.targetClaimId, 'targetClaimId')
  const sourceIds = tokenArray(data?.sourceIds, 32)
  if (!sourceIds.length) throw new functions.https.HttpsError('invalid-argument', 'Correction source is required.')
  const targetRef = db.doc(`users/${uid}/lifeClaims/${targetClaimId}`)
  const target = await targetRef.get()
  if (!target.exists || target.get('ownerId') !== uid) throw new functions.https.HttpsError('not-found', 'Target claim is unavailable.')

  const correctionRef = db.doc(`users/${uid}/lifeCorrections/${correctionId}`)
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(correctionRef)
    if (existing.exists) throw new functions.https.HttpsError('already-exists', 'Correction already exists.')
    transaction.create(correctionRef, {
      id: correctionId,
      ownerId: uid,
      targetClaimId,
      sourceIds,
      note: data?.note ? requireString(data.note, 'note', 1000) : '',
      replacementValue: data?.replacementValue === undefined ? null : boundedJson(data.replacementValue),
      createdAt: fieldValue.serverTimestamp(),
    })
    transaction.set(targetRef, {
      status: 'superseded',
      supersededByCorrectionId: correctionId,
      supersededAt: fieldValue.serverTimestamp(),
    }, { merge: true })
  })
  const invalidated = await invalidateDependency(uid, targetClaimId, `correction:${correctionId}`)
  return { correctionId, targetClaimId, invalidated }
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
  const memory = await db.doc(`users/${uid}/memories/${memoryId}`).get()
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
    db.doc(`users/${uid}/sceneTruthPackets/${sceneTruthPacketId}`).get(),
    personModelBundleIds.length
      ? db.getAll(...personModelBundleIds.map((id) => db.doc(`users/${uid}/personModelBundles/${id}`)))
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
  return {
    available: true,
    schemaVersion: 'urai-life-model-v1',
    sceneTruthPacketId,
    personModelBundleIds,
    decision: String(scene.get('decision')),
    presentationClass: String(scene.get('presentationClass')),
    syntheticOutputMayBecomeHistoricalSource: false,
  }
})
