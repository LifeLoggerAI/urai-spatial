import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

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

export const upsertLifeMovieManifest = lifeMovieFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const movieId = requireToken(data?.movieId, 'movieId')
  const status = data?.status === 'ready' ? 'ready' : 'draft'
  const requested = requestedChapters(data?.chapters)
  const refs = requested.map((chapter) => db.doc(`users/${uid}/memories/${chapter.memoryId}`))
  const snapshots = await db.getAll(...refs)
  const chapters = requested.map((chapter, index) => trustedChapterFromMemory(chapter, snapshots[index]))

  const ref = db.doc(`users/${uid}/lifeMovies/${movieId}`)
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref)
    const version = Math.max(1, Number(current.get('version') ?? 0) + 1)
    transaction.set(ref, {
      id: movieId,
      version,
      ownerId: uid,
      status,
      consentState: 'authorized',
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
    chapterCount: chapters.length,
    recordedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { movieId, status, chapterCount: chapters.length }
})

export const revokeLifeMovieManifest = lifeMovieFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const movieId = requireToken(data?.movieId, 'movieId')
  const ref = db.doc(`users/${uid}/lifeMovies/${movieId}`)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Life Movie manifest was not found.')
  }

  await ref.set({
    consentState: 'revoked',
    status: 'draft',
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.collection(`users/${uid}/privacyAudit`).add({
    ownerId: uid,
    kind: 'life_movie.manifest_revoked',
    movieId,
    recordedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { movieId, revoked: true }
})
