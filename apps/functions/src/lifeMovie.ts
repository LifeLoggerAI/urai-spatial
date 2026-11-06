import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'
import { assertFirstPrivateMemoryPlaybackBinding } from './privatePreparedMediaAuthority'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const lifeMovieFunctions = functions.region('us-central1')
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,160}$/
const MAX_CHAPTERS = 64
const TRUTH_CLASSES = new Set([
  'RECORDED_SOURCE_TRUTH',
  'ATTRIBUTED_FAMILY_RECOLLECTION',
  'SPATIALLY_RECONSTRUCTABLE',
  'INTERPRETIVE_CINEMATIC_RECREATION',
  'UNKNOWN_UNRESOLVED',
])

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function requireToken(value: unknown, label: string) {
  const token = String(value ?? '').trim()
  if (!SAFE_TOKEN.test(token)) {
    throw new functions.https.HttpsError('invalid-argument', `${label} is invalid.`)
  }
  return token
}

function tokenArray(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const token = String(item ?? '').trim()
        return SAFE_TOKEN.test(token) ? [token] : []
      })
    : []
}

function internalHref(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw.startsWith('/')) return undefined
  try {
    const parsed = new URL(raw, 'https://urai.invalid')
    if (parsed.origin !== 'https://urai.invalid') return undefined
    const allowed = [
      '/life-map',
      '/focus',
      '/replay',
      '/life-movie',
      '/spatial/memory-world',
      '/spatial/captured-reality',
      '/spatial/interpretive-world',
    ]
    if (!allowed.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix + '/'))) return undefined
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return undefined
  }
}

type RequestedChapter = {
  id: string
  memoryId: string
  order: number
}

function requestedChapters(value: unknown): RequestedChapter[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CHAPTERS) {
    throw new functions.https.HttpsError('invalid-argument', 'Life Movie chapters are invalid.')
  }
  const chapters = value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Life Movie chapter is invalid.')
    }
    const raw = entry as Record<string, unknown>
    const id = requireToken(raw.id, 'chapterId')
    const memoryId = requireToken(raw.memoryId, 'memoryId')
    const order = raw.order
    if (typeof order !== 'number' || !Number.isSafeInteger(order) || order < 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Life Movie chapter order is invalid.')
    }
    return { id, memoryId, order }
  })

  if (
    new Set(chapters.map((chapter) => chapter.id)).size !== chapters.length
    || new Set(chapters.map((chapter) => chapter.memoryId)).size !== chapters.length
    || new Set(chapters.map((chapter) => chapter.order)).size !== chapters.length
  ) {
    throw new functions.https.HttpsError('invalid-argument', 'Life Movie chapter identity is ambiguous.')
  }
  return chapters.sort((left, right) => left.order - right.order)
}

function trustedChapterFromMemory(requested: RequestedChapter, snapshot: FirebaseFirestore.DocumentSnapshot) {
  const expectedOwnerId = snapshot.ref.parent.parent?.id
  const ownerId = snapshot.get('ownerId') ?? snapshot.get('userId')
  if (!snapshot.exists || !expectedOwnerId || ownerId !== expectedOwnerId || snapshot.get('deleted') === true) {
    throw new functions.https.HttpsError('failed-precondition', 'Life Movie memory is unavailable.')
  }
  const consentState = snapshot.get('consentState')
  if (consentState === 'revoked') {
    throw new functions.https.HttpsError('failed-precondition', 'Life Movie memory consent was revoked.')
  }
  if (consentState === 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Life Movie memory consent is pending.')
  }
  // A private first recording is not movie-eligible until explicitly activated.
  // Unknown/missing consent is not a grant, even for an otherwise owned memory.
  if (consentState !== 'authorized' || snapshot.get('privacy') === 'hidden') {
    throw new functions.https.HttpsError('failed-precondition', 'Life Movie memory is not authorized.')
  }

  const lifeMovie = snapshot.get('lifeMovie') as Record<string, unknown> | undefined
  const rawTruthClass = String(lifeMovie?.truthClass ?? snapshot.get('truthClass') ?? 'UNKNOWN_UNRESOLVED')
  const truthClass = TRUTH_CLASSES.has(rawTruthClass) ? rawTruthClass : 'UNKNOWN_UNRESOLVED'
  const rawConfidence = Number(lifeMovie?.confidence ?? snapshot.get('confidence') ?? 0)
  const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0
  const provenance = lifeMovie?.provenance && typeof lifeMovie.provenance === 'object'
    ? lifeMovie.provenance as Record<string, unknown>
    : {}

  const cinematicAssetId = typeof lifeMovie?.cinematicAssetId === 'string' && SAFE_TOKEN.test(lifeMovie.cinematicAssetId)
    ? lifeMovie.cinematicAssetId
    : undefined
  const spatialAssetId = typeof lifeMovie?.spatialAssetId === 'string' && SAFE_TOKEN.test(lifeMovie.spatialAssetId)
    ? lifeMovie.spatialAssetId
    : undefined
  const captionTrackId = typeof lifeMovie?.captionTrackId === 'string' && SAFE_TOKEN.test(lifeMovie.captionTrackId)
    ? lifeMovie.captionTrackId
    : undefined
  const audioMixId = typeof lifeMovie?.audioMixId === 'string' && SAFE_TOKEN.test(lifeMovie.audioMixId)
    ? lifeMovie.audioMixId
    : undefined
  const sceneTruthPacketId = typeof lifeMovie?.sceneTruthPacketId === 'string' && SAFE_TOKEN.test(lifeMovie.sceneTruthPacketId)
    ? lifeMovie.sceneTruthPacketId
    : undefined
  const personModelBundleIds = tokenArray(lifeMovie?.personModelBundleIds)

  return {
    id: requested.id,
    memoryId: requested.memoryId,
    order: requested.order,
    truthClass,
    confidence,
    consentState: 'authorized',
    ...(cinematicAssetId ? { cinematicAssetId } : {}),
    ...(spatialAssetId ? { spatialAssetId } : {}),
    ...(captionTrackId ? { captionTrackId } : {}),
    ...(audioMixId ? { audioMixId } : {}),
    ...(sceneTruthPacketId ? { sceneTruthPacketId } : {}),
    personModelBundleIds,
    languageTracks: tokenArray(lifeMovie?.languageTracks),
    ...(internalHref(lifeMovie?.replayEntry) ? { replayEntry: internalHref(lifeMovie?.replayEntry) } : {}),
    ...(internalHref(lifeMovie?.replayExit) ? { replayExit: internalHref(lifeMovie?.replayExit) } : {}),
    provenance: {
      sourceIds: tokenArray(provenance.sourceIds),
      storyNodeIds: tokenArray(provenance.storyNodeIds),
      objectIds: tokenArray(provenance.objectIds),
      providerTaskIds: tokenArray(provenance.providerTaskIds),
    },
  }
}

async function requireReadyLifeModelAuthority(
  uid: string,
  chapters: ReturnType<typeof trustedChapterFromMemory>[],
  transaction: FirebaseFirestore.Transaction,
) {
  const sceneIds = [...new Set(chapters.map((chapter) => chapter.sceneTruthPacketId).filter((value): value is string => Boolean(value)))]
  if (sceneIds.length !== chapters.length) {
    throw new functions.https.HttpsError('failed-precondition', 'READY_LIFE_MOVIE_REQUIRES_SCENE_TRUTH')
  }
  const bundleIds = [...new Set(chapters.flatMap((chapter) => chapter.personModelBundleIds))]
  const [sceneSnapshots, bundleSnapshots] = await Promise.all([
    sceneIds.length ? transaction.getAll(...sceneIds.map((id) => db.doc(`users/${uid}/sceneTruthPackets/${id}`))) : [],
    bundleIds.length ? transaction.getAll(...bundleIds.map((id) => db.doc(`users/${uid}/personModelBundles/${id}`))) : [],
  ])
  const dependencyIds = new Set<string>(chapters.map((chapter) => chapter.memoryId))

  for (const scene of sceneSnapshots) {
    if (
      !scene.exists
      || scene.get('ownerId') !== uid
      || scene.get('schemaVersion') !== 'urai-life-model-v1'
      || scene.get('state') !== 'current'
      || scene.get('syntheticOutputMayBecomeHistoricalSource') !== false
      || !['READY','READY_WITH_OCCLUSION','READY_INTERPRETIVE'].includes(String(scene.get('decision') ?? ''))
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'Life Movie SceneTruth authority is unavailable.')
    }
    dependencyIds.add(scene.id)
    for (const dependency of Array.isArray(scene.get('dependencyIds')) ? scene.get('dependencyIds') : []) {
      dependencyIds.add(String(dependency))
    }
  }

  for (const bundle of bundleSnapshots) {
    if (
      !bundle.exists
      || bundle.get('ownerId') !== uid
      || bundle.get('schemaVersion') !== 'urai-life-model-v1'
      || bundle.get('state') !== 'current'
      || bundle.get('synthetic') !== false
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'Life Movie Person Model authority is unavailable.')
    }
    dependencyIds.add(bundle.id)
    for (const dependency of Array.isArray(bundle.get('dependencyIds')) ? bundle.get('dependencyIds') : []) {
      dependencyIds.add(String(dependency))
    }
  }

  return [...dependencyIds]
}

// Match the protected-media authority's canonical consent expiry parser.
// A malformed C7 projection is not evidence that a deletion fence was released.
function exportExpiryMillis(value: unknown): number {
  const time = value instanceof admin.firestore.Timestamp ? value.toMillis()
    : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value ? Date.parse(value) : Number.NaN
  return Number.isSafeInteger(time) ? time : Number.NaN
}

type ReadyLifeMovieConsentEpoch = { revision: number; receiptHash: string }
function requirePreparedChapterReplayBinding(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  uid: string,
  memoryId: string,
  epoch: ReadyLifeMovieConsentEpoch,
): void {
  const memory = snapshot.data() as Record<string, unknown> | undefined
  const source = memory?.sourceProvenance && typeof memory.sourceProvenance === 'object'
    && !Array.isArray(memory.sourceProvenance)
      ? memory.sourceProvenance as Record<string, unknown> : {}
  const prepared = Object.prototype.hasOwnProperty.call(source, 'derivativeSha256')
    || source.authenticity === 'source-derivative-not-generated-autobiography'
    || Object.prototype.hasOwnProperty.call(memory ?? {}, 'firstPrivateMemoryConsent')
    || Object.prototype.hasOwnProperty.call(memory ?? {}, 'firstPrivateMemoryActivation')
  if (!prepared) return // Existing ordinary non-prepared Life Movie chapters.
  const activation = memory?.firstPrivateMemoryActivation && typeof memory.firstPrivateMemoryActivation === 'object'
    && !Array.isArray(memory.firstPrivateMemoryActivation)
      ? memory.firstPrivateMemoryActivation as Record<string, unknown> : {}
  const receiptId = activation.mediaReceiptId
  const attachments = memory?.sourceMedia
  if (typeof receiptId !== 'string' || !Array.isArray(attachments)
    || !attachments.some(entry => entry && typeof entry === 'object'
      && !Array.isArray(entry) && entry.kind === 'audio' && entry.mediaReceiptId === receiptId)) {
    throw new functions.https.HttpsError('failed-precondition', 'Life Movie prepared memory is not playback-activated.')
  }
  try {
    assertFirstPrivateMemoryPlaybackBinding(memory, uid, memoryId, receiptId, epoch.revision, epoch.receiptHash)
  } catch {
    throw new functions.https.HttpsError('failed-precondition', 'Life Movie prepared memory has stale Replay authority.')
  }
}

// Life Movie catalog admission must not outlive the current owner's C1 grant.
// This uses the SAME transaction as chapter snapshots and the manifest write.
async function requireCurrentLifeMovieC1(
  transaction: FirebaseFirestore.Transaction, uid: string, status: 'draft' | 'ready',
): Promise<ReadyLifeMovieConsentEpoch> {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex')
  const [owner, policySnap, receiptSnap, central, local, barrier, permanent, consentBlock] = await transaction.getAll(
    db.doc(`users/${uid}`),
    db.doc(`users/${uid}/privacyPolicy/current`),
    db.doc(`consentRecords/${uid}_memory_storage`),
    db.doc(`privacyDeletionTombstones/${uid}`),
    db.doc(`users/${uid}/privacyRuntime/exportAuthority`),
    db.doc(`privateLifeModelOwnerBarriers/${hash(uid)}`),
    db.doc(`uraiPrivateLifeModelOwnerFences/${hash(uid)}`),
    db.doc(`jobConsentBlocks/${hash(uid + '\n' + 'memory.storage')}`),
  )
  const activeDeletions = await transaction.get(
    db.collection(`users/${uid}/deletionJobs`)
      .where('state', 'in', ['awaiting-grace', 'queued', 'in-progress', 'failed']).limit(1),
  )
  const policy = policySnap.data(), c = receiptSnap.data()
  const rawExpiry = c?.expiresAt
  const expiry = typeof rawExpiry === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(rawExpiry)
    && Number.isFinite(Date.parse(rawExpiry)) && new Date(rawExpiry).toISOString() === rawExpiry
      ? Date.parse(rawExpiry) : Number.NaN
  const pending = local.get('pendingDeletions'), generation = local.exists ? local.get('generation') : 0
  const deny = () => { throw new functions.https.HttpsError('failed-precondition', 'Current Life Movie memory consent is unavailable.') }
  if (!owner.exists || owner.get('deleted') === true || ['deleting', 'deleted', 'disabled'].includes(String(owner.get('accountStatus')))
    || !policySnap.exists || !isCanonicalStoredPolicy(policy, uid) || policy.revision < 1
    || policy.domains.memory.mode !== 'granted' || policy.enforcement.state !== 'fully-enforced'
    || (status === 'ready' && (policy.domains.memory.replayVisible !== true || policy.domains.memory.lifeMapVisible !== true))
    || !receiptSnap.exists || c?.uid !== uid || c.purpose !== 'memory.storage'
    || c.consentTier !== 'C1' || c.policyVersion !== '1.0.0' || c.status !== 'granted'
    || !/^[a-f0-9]{64}$/.test(String(c.receiptHash)) || !Number.isSafeInteger(expiry) || expiry <= Date.now()
    || !Number.isSafeInteger(generation) || generation < 0
    || (local.exists && (!pending || typeof pending !== 'object' || Array.isArray(pending)))
    || (pending && Object.keys(pending).length > 0)
    || !activeDeletions.empty || barrier.get('blocked') === true) deny()
  if (central.exists) {
    const marker = central.data() ?? {}, keys = Object.keys(marker)
    // active:false is only released when no unresolved deletion metadata remains.
    const inactive = marker.active === false && keys.every(k => ['uid', 'active', 'updatedAt'].includes(k))
      && (!keys.includes('updatedAt') || marker.updatedAt instanceof admin.firestore.Timestamp)
    const released = !keys.includes('active') && keys.every(k => ['uid', 'updatedAt'].includes(k))
      && marker.updatedAt instanceof admin.firestore.Timestamp
    const projection = !keys.includes('active') && keys.every(k => ['uid', 'updatedAt', 'exportConsentStatus',
      'exportConsentReceiptHash', 'exportConsentPolicyVersion', 'exportConsentExpiresAt'].includes(k))
      && ['granted', 'revoked'].includes(String(marker.exportConsentStatus))
      && /^[a-f0-9]{64}$/.test(String(marker.exportConsentReceiptHash))
      && marker.exportConsentPolicyVersion === '1.0.0'
      && (!keys.includes('updatedAt') || marker.updatedAt instanceof admin.firestore.Timestamp)
        && Number.isSafeInteger(exportExpiryMillis(marker.exportConsentExpiresAt))
    if (marker.uid !== uid || keys.some(k => k.startsWith('deletionPlanningLease'))
      || (!inactive && !released && !projection)) deny()
  }
  if (permanent.exists && (permanent.get('ownerHash') !== hash(uid)
    || permanent.get('deleted') !== false || permanent.get('deletionEpoch') !== 0)) deny()
  if (consentBlock.exists && (consentBlock.get('ownerUid') !== uid
    || consentBlock.get('purpose') !== 'memory.storage' || consentBlock.get('active') !== false)) deny()
  return { revision: policy.revision, receiptHash: c.receiptHash }
}

export const upsertLifeMovieManifest = lifeMovieFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const movieId = requireToken(data?.movieId, 'movieId')
  const status = data?.status === 'ready' ? 'ready' : 'draft'
  const requested = requestedChapters(data?.chapters)
  const refs = requested.map((chapter) => db.doc(`users/${uid}/memories/${chapter.memoryId}`))
  const ref = db.doc(`users/${uid}/lifeMovies/${movieId}`)
  await db.runTransaction(async (transaction) => {
    // Read selected memories and ready-state dependencies in the SAME atomic
    // transaction as the manifest write. Revocation/deletion must retry or
    // reject the manifest, never authorize stale pre-transaction snapshots.
    const consentEpoch = await requireCurrentLifeMovieC1(transaction, uid, status)
    const current = await transaction.get(ref)
    // A revoked movie ID cannot be silently resurrected by an upsert.
    // Both revocation and re-authoring read/write this same document in
    // Firestore transactions, so concurrent revocation triggers a retry.
    if (current.exists && (
      current.get('ownerId') !== uid
      || current.get('consentState') !== 'authorized'
      || current.get('revokedAt') != null
    )) {
      throw new functions.https.HttpsError('failed-precondition', 'Life Movie manifest is not authorized for update.')
    }
    const snapshots = await transaction.getAll(...refs)
    const chapters = requested.map((chapter, index) => trustedChapterFromMemory(chapter, snapshots[index]))
    if (status === 'ready') {
      snapshots.forEach((snapshot, index) =>
        requirePreparedChapterReplayBinding(snapshot, uid, requested[index].memoryId, consentEpoch))
    }
    const dependencyIds = status === 'ready'
      ? await requireReadyLifeModelAuthority(uid, chapters, transaction)
      : [...new Set(chapters.map((chapter) => chapter.memoryId))]
    const version = Math.max(1, Number(current.get('version') ?? 0) + 1)
    transaction.set(ref, {
      id: movieId,
      version,
      ownerId: uid,
      status,
      consentState: 'authorized',
      lifeModelSchemaVersion: 'urai-life-model-v1',
      syntheticOutputMayBecomeHistoricalSource: false,
      dependencyIds,
      chapters,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: current.exists
        ? current.get('createdAt') ?? admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.serverTimestamp(),
    })
  })

  await db.collection(`users/${uid}/privacyAudit`).add({
    ownerId: uid,
    kind: 'life_movie.manifest_upserted',
    movieId,
    chapterCount: requested.length,
    recordedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { movieId, status, chapterCount: requested.length }
})

export const revokeLifeMovieManifest = lifeMovieFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const movieId = requireToken(data?.movieId, 'movieId')
  const ref = db.doc(`users/${uid}/lifeMovies/${movieId}`)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
      throw new functions.https.HttpsError('not-found', 'Life Movie manifest was not found.')
    }
    transaction.update(ref, {
      consentState: 'revoked',
      status: 'draft',
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })

  await db.collection(`users/${uid}/privacyAudit`).add({
    ownerId: uid,
    kind: 'life_movie.manifest_revoked',
    movieId,
    recordedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { movieId, revoked: true }
})
