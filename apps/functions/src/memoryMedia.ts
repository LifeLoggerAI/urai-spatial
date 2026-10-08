import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions/v1'
import { createHash, randomBytes } from 'node:crypto'
import { chargeExportValue, requireExportReadBudget, type ExportReadBudget } from './exportPagination'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
type Row = Record<string, unknown>
type MediaReceipt = Row & { memoryId: string; receiptId: string; sha256: string; contentType: string; objectPath: string; bucketName: string;
  byteLength: number; attemptNonce: string; kind: string; state: string; storageGeneration?: string; leaseExpiresAt: unknown }
type Bucket = ReturnType<ReturnType<typeof admin.storage>['bucket']>
export const MEMORY_MEDIA_SCHEMA = 'urai-owned-memory-media-v1'
const SCHEMA = MEMORY_MEDIA_SCHEMA
const SHA = /^[a-f0-9]{64}$/
const ID = /^[A-Za-z0-9_-]{1,128}$/
const UPLOAD_BYTES = 4 * 1024 * 1024
const UPLOAD_LEASE_MS = 120_000
const MIME = new Map([
  ['image/png', ['image', 'png']], ['image/jpeg', ['image', 'jpg']], ['image/webp', ['image', 'webp']],
  ['audio/mpeg', ['audio', 'mp3']], ['audio/wav', ['audio', 'wav']], ['audio/ogg', ['audio', 'ogg']],
  ['video/mp4', ['video', 'mp4']], ['video/webm', ['video', 'webm']],
])
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
function fail(code: string): never { throw new functions.https.HttpsError('failed-precondition', code) }
function id(value: unknown): string { if (typeof value !== 'string' || !ID.test(value)) fail('MEMORY_MEDIA_ID_INVALID'); return value }
function millis(value: unknown) {
  // Canonical consent-api stores its immutable expiry as an ISO string; upload
  // leases use SDK Timestamps. Do not turn a malformed date into an open lease.
  const time = value instanceof admin.firestore.Timestamp ? value.toMillis()
    : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value ? Date.parse(value) : Number.NaN
  return Number.isSafeInteger(time) ? time : Number.NaN
}
function objectPath(uid: string, memoryId: string, receiptId: string, digest: string, contentType: string) {
  const extension = MIME.get(contentType)?.[1]
  if (!ID.test(uid) || !ID.test(memoryId) || !SHA.test(receiptId) || !SHA.test(digest) || !extension) fail('MEMORY_MEDIA_OBJECT_BOUNDARY_INVALID')
  return `private-memory-media/${sha(uid)}/${sha(memoryId)}/${receiptId}/${digest}.${extension}`
}
function validSignature(bytes: Buffer, mime: string) {
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  if (mime === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
  if (mime === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (mime === 'audio/wav') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE'
  if (mime === 'audio/ogg') return bytes.toString('ascii', 0, 4) === 'OggS'
  if (mime === 'audio/mpeg') return bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  if (mime === 'video/mp4') return bytes.toString('ascii', 4, 8) === 'ftyp'
  if (mime === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'))
  return false
}

async function readOwner(transaction: FirebaseFirestore.Transaction, uid: string, memoryId: string) {
  const [user, memory, policy, consent, central, local, deletions, barrier, permanent, consentBlock] = await Promise.all([
    transaction.get(db.doc(`users/${uid}`)), transaction.get(db.doc(`users/${uid}/memories/${memoryId}`)),
    transaction.get(db.doc(`users/${uid}/privacyPolicy/current`)), transaction.get(db.doc(`consentRecords/${uid}_memory_storage`)),
    transaction.get(db.doc(`privacyDeletionTombstones/${uid}`)), transaction.get(db.doc(`users/${uid}/privacyRuntime/exportAuthority`)),
    transaction.get(db.collection(`users/${uid}/deletionJobs`).where('state', 'in', ['awaiting-grace', 'queued', 'in-progress', 'failed']).limit(1)),
    transaction.get(db.doc(`privateLifeModelOwnerBarriers/${sha(uid)}`)), transaction.get(db.doc(`uraiPrivateLifeModelOwnerFences/${sha(uid)}`)),
    transaction.get(db.doc(`jobConsentBlocks/${sha(uid + '\n' + 'memory.storage')}`)),
  ])
  const p = policy.data(), c = consent.data(), generation = local.exists ? local.get('generation') : 0
  const pending = local.get('pendingDeletions'), expiresAt = millis(c?.expiresAt)
  if (!user.exists || user.get('deleted') === true || ['deleting', 'deleted', 'disabled'].includes(String(user.get('accountStatus')))
    || !memory.exists || (memory.get('ownerId') ?? memory.get('userId')) !== uid || memory.get('deleted') === true
    || ['pending', 'revoked'].includes(String(memory.get('consentState')))
    || !policy.exists || p?.ownerId !== uid || p.version !== 2 || !Number.isSafeInteger(p.revision) || p.revision < 1
    || row(row(p.domains).memory).mode !== 'granted' || row(p.enforcement).state !== 'fully-enforced'
    || !consent.exists || c?.uid !== uid || c.purpose !== 'memory.storage' || c.consentTier !== 'C1' || c.policyVersion !== '1.0.0'
    || c.status !== 'granted' || !SHA.test(String(c.receiptHash)) || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()
    || (central.exists && (central.get('uid') !== uid || central.get('active') === true))
    || !Number.isSafeInteger(generation) || generation < 0 || (local.exists && (!pending || typeof pending !== 'object' || Array.isArray(pending)))
    || (pending && Object.keys(pending).length > 0) || !deletions.empty
    || barrier.get('blocked') === true || permanent.get('deleted') === true || consentBlock.get('active') === true) fail('MEMORY_MEDIA_CURRENT_AUTHORITY_REQUIRED')
  return { consentRevision: p.revision as number, consentReceiptHash: c.receiptHash as string, consentExpiresAt: expiresAt, deletionGeneration: generation as number, memory }
}
function sameAuthority(value: Row, authority: Awaited<ReturnType<typeof readOwner>>) {
  for (const key of ['consentRevision', 'consentReceiptHash', 'consentExpiresAt', 'deletionGeneration'] as const) {
    if (value[key] !== authority[key]) fail('MEMORY_MEDIA_AUTHORITY_CHANGED')
  }
}
function receipt(value: unknown, uid: string): MediaReceipt {
  const r = row(value), memoryId = id(r.memoryId), receiptId = String(r.receiptId), digest = String(r.sha256), contentType = String(r.contentType)
  if (r.schemaVersion !== SCHEMA || r.bucketName !== admin.storage().bucket().name || r.ownerUid !== uid || !SHA.test(receiptId) || !SHA.test(digest) || !MIME.has(contentType)
    || r.kind !== MIME.get(contentType)![0] || !Number.isSafeInteger(r.byteLength) || Number(r.byteLength) < 1 || Number(r.byteLength) > UPLOAD_BYTES
    || !SHA.test(String(r.attemptNonce)) || !['uploading', 'closing', 'ready', 'aborted', 'deleted'].includes(String(r.state))
    || !Number.isSafeInteger(millis(r.leaseExpiresAt))
    || r.objectPath !== objectPath(uid, memoryId, receiptId, digest, contentType)) fail('MEMORY_MEDIA_RECEIPT_INVALID')
  return { ...r, memoryId, receiptId, sha256: digest, contentType, bucketName: String(r.bucketName), objectPath: String(r.objectPath), byteLength: Number(r.byteLength),
    attemptNonce: String(r.attemptNonce), kind: String(r.kind), state: String(r.state), storageGeneration: typeof r.storageGeneration === 'string' ? r.storageGeneration : undefined, leaseExpiresAt: r.leaseExpiresAt }
}
function ownedMetadata(metadata: Row, r: ReturnType<typeof receipt>, uid: string) {
  const m = row(metadata.metadata)
  if (m.ownerHash !== sha(uid) || m.memoryHash !== sha(r.memoryId) || m.receiptId !== r.receiptId || m.attemptNonce !== r.attemptNonce
    || m.sourceSha256 !== r.sha256 || !/^[1-9][0-9]{0,39}$/.test(String(metadata.generation))) fail('MEMORY_MEDIA_OBJECT_AUTHORITY_CHANGED')
  return m
}

function cleanupLedger(database: FirebaseFirestore.Firestore, uid: string, r: MediaReceipt) {
  const ref = database.doc(`users/${uid}/memoryMediaReceipts/${r.receiptId}`)
  const read = async (transaction: FirebaseFirestore.Transaction) => {
    const current = receipt((await transaction.get(ref)).data(), uid)
    if (current.attemptNonce !== r.attemptNonce || current.sha256 !== r.sha256 || current.objectPath !== r.objectPath) fail('MEMORY_MEDIA_CLEANUP_AUTHORITY_CHANGED')
    const values = current.cleanupGenerations ?? []
    if (!Array.isArray(values) || values.length > 32 || values.some(g => typeof g !== 'string' || !/^[1-9][0-9]{0,39}$/.test(g))
      || new Set(values).size !== values.length) fail('MEMORY_MEDIA_CLEANUP_HISTORY_INVALID')
    return values as string[]
  }
  return {
    read: () => database.runTransaction(read),
    record: (generation: string) => database.runTransaction(async transaction => {
      const values = await read(transaction)
      if (!/^[1-9][0-9]{0,39}$/.test(generation)) fail('MEMORY_MEDIA_CLEANUP_HISTORY_INVALID')
      if (!values.includes(generation)) {
        if (values.length >= 32) fail('MEMORY_MEDIA_CLEANUP_HISTORY_INVALID')
        transaction.update(ref, { cleanupGenerations: [...values, generation] })
      }
    }),
  }
}

// A zero-byte conditional replacement remains at the create-only attempt path.
// Deleting that marker would allow a delayed original upload to recreate bytes.
// The marker contains hashes/nonce only and is a disclosed privacy tombstone.
async function closeObject(bucket: Bucket, uid: string, r: ReturnType<typeof receipt>, requireCurrent: () => Promise<unknown>, ledger: ReturnType<typeof cleanupLedger>) {
  const file = bucket.file(r.objectPath)
  // A live generation can already be absent while Object Versioning retains the
  // original receipt-pinned generation. Preserve and dispose that known authority.
  if (r.storageGeneration !== undefined) {
    await requireCurrent(); await ledger.record(r.storageGeneration); await requireCurrent()
  }
  const disposeKnownGenerations = async (marker: Row) => {
    const m = ownedMetadata(marker, r, uid)
    await requireCurrent()
    const known = await ledger.read(); await requireCurrent()
    if (m.disposalVersion !== '2' || m.disposalHistoryHash !== sha(JSON.stringify(known))) fail('MEMORY_MEDIA_CLEANUP_HISTORY_REQUIRED')
    for (const generation of known) {
      await requireCurrent()
      const old = bucket.file(r.objectPath, { generation })
      let previous: Row | undefined
      try { [previous] = await old.getMetadata() as unknown as [Row] } catch (error) {
        if (Number((error as { code?: unknown }).code) !== 404) throw error
      }
      await requireCurrent()
      if (!previous) continue
      const metadata = ownedMetadata(previous, r, uid)
      if (generation === String(marker.generation) || metadata.tombstone === 'true' || Number(previous.size) !== r.byteLength
        || previous.contentType !== r.contentType) fail('MEMORY_MEDIA_CLEANUP_HISTORY_INVALID')
      await old.delete({ ignoreNotFound: true, ifGenerationMatch: generation })
      await requireCurrent()
      try { await old.getMetadata(); fail('MEMORY_MEDIA_PRIOR_GENERATION_NOT_DISPOSED') } catch (error) {
        if (Number((error as { code?: unknown }).code) !== 404) throw error
      }
      await requireCurrent()
    }
    return String(marker.generation)
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    await requireCurrent()
    let metadata: Row | undefined
    try { [metadata] = await file.getMetadata() as unknown as [Row] } catch (error) {
      if (Number((error as { code?: unknown }).code) !== 404) throw error
    }
    await requireCurrent()
    if (metadata) {
      const m = ownedMetadata(metadata, r, uid)
      if (m.tombstone === 'true' && Number(metadata.size) === 0) return disposeKnownGenerations(metadata)
      if (Number(metadata.size) !== r.byteLength || metadata.contentType !== r.contentType) fail('MEMORY_MEDIA_OBJECT_AUTHORITY_CHANGED')
      // Persist BEFORE overwrite. Versioned Storage retains that old generation
      // and process termination must not lose its disposal authority.
      await ledger.record(String(metadata.generation)); await requireCurrent()
    }
    const known = await ledger.read(); await requireCurrent()
    try {
      await file.save(Buffer.alloc(0), { resumable: false, validation: 'crc32c', contentType: 'application/octet-stream',
        preconditionOpts: { ifGenerationMatch: metadata ? String(metadata.generation) : 0 },
        metadata: { metadata: { ownerHash: sha(uid), memoryHash: sha(r.memoryId), receiptId: r.receiptId,
          attemptNonce: r.attemptNonce, sourceSha256: r.sha256, tombstone: 'true', disposalVersion: '2',
          disposalHistoryHash: sha(JSON.stringify(known)) } } })
    } catch (error) { if (Number((error as { code?: unknown }).code) === 412) continue; throw error }
    await requireCurrent()
    const [closed] = await file.getMetadata()
    const m = ownedMetadata(closed as unknown as Row, r, uid)
    if (m.tombstone !== 'true' || Number(closed.size) !== 0) fail('MEMORY_MEDIA_CLEANUP_UNVERIFIED')
    await requireCurrent()
    return disposeKnownGenerations(closed as unknown as Row)
  }
  fail('MEMORY_MEDIA_CLEANUP_CONFLICTED')
}

function authenticatedOwner(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid || !ID.test(uid)) throw new functions.https.HttpsError('unauthenticated', 'Authentication required.')
  const header = context.rawRequest?.get('authorization'), bearer = typeof header === 'string' && /^Bearer [^\s]+$/.test(header) ? header.slice(7) : ''
  const requireAuthentication = async () => {
    if (!bearer) throw new functions.https.HttpsError('unauthenticated', 'Authenticated upload required.')
    const token = await admin.auth().verifyIdToken(bearer, true)
    if (token.uid !== uid || !Number.isSafeInteger(token.auth_time) || token.auth_time <= 0
      || Date.now() / 1000 - token.auth_time > 300 || token.auth_time > Math.floor(Date.now() / 1000)) {
      throw new functions.https.HttpsError('unauthenticated', 'Recent owner authentication required.')
    }
  }
  return { uid, requireAuthentication }
}

export const getMemoryMediaUploadAuthority = functions.https.onCall(async (data, context) => {
  const { uid, requireAuthentication } = authenticatedOwner(context), value = row(data), memoryId = id(value.memoryId)
  if (Object.keys(value).some(key => key !== 'memoryId')) fail('MEMORY_MEDIA_AUTHORITY_REQUEST_INVALID')
  await requireAuthentication()
  await db.runTransaction(transaction => readOwner(transaction, uid, memoryId))
  await requireAuthentication()
  const current = await db.runTransaction(transaction => readOwner(transaction, uid, memoryId))
  return { schemaVersion: SCHEMA, ownerId: uid, memoryId, consentRevision: current.consentRevision, expiresAt: current.consentExpiresAt }
})

export const registerMemoryMedia = functions.runWith({ timeoutSeconds: 180, memory: '256MB' }).https.onCall(async (data, context) => {
  const { uid, requireAuthentication } = authenticatedOwner(context)
  await requireAuthentication()
  const value = row(data), memoryId = id(value.memoryId), operationId = id(value.operationId), contentType = String(value.contentType)
  if (Object.keys(value).some(key => !['memoryId', 'operationId', 'contentType', 'kind', 'base64'].includes(key)) || !MIME.has(contentType)
    || value.kind !== MIME.get(contentType)![0] || typeof value.base64 !== 'string' || !value.base64.length
    || value.base64.length > 4 * Math.ceil(UPLOAD_BYTES / 3) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64)) fail('MEMORY_MEDIA_UPLOAD_INVALID')
  const bytes = Buffer.from(value.base64, 'base64')
  if (!bytes.length || bytes.length > UPLOAD_BYTES || bytes.toString('base64') !== value.base64 || !validSignature(bytes, contentType)) fail('MEMORY_MEDIA_UPLOAD_INVALID')
  const digest = sha(bytes), receiptId = sha(`${uid}\n${memoryId}\n${operationId}\n${SCHEMA}`)
  const ref = db.doc(`users/${uid}/memoryMediaReceipts/${receiptId}`), bucket = admin.storage().bucket()
  let claimed = false, bound: ReturnType<typeof receipt> | undefined
  const requireCurrent = async () => {
    await requireAuthentication()
    const check = () => db.runTransaction(async transaction => {
      const [authority, snap] = await Promise.all([readOwner(transaction, uid, memoryId), transaction.get(ref)])
      const r = receipt(snap.data(), uid)
      sameAuthority(r, authority)
      if (!bound || r.attemptNonce !== bound.attemptNonce || r.state !== 'uploading' || millis(r.leaseExpiresAt) <= Date.now()) fail('MEMORY_MEDIA_UPLOAD_LEASE_UNAVAILABLE')
      return r
    })
    await check()
    await requireAuthentication()
    // Re-read live consent/deletion after the authentication service await.
    return check()
  }
  const requireReady = async () => {
    const check = () => db.runTransaction(async transaction => {
      const [authority, snap] = await Promise.all([readOwner(transaction, uid, memoryId), transaction.get(ref)])
      const current = receipt(snap.data(), uid); sameAuthority(current, authority)
      if (current.state !== 'ready' || current.sha256 !== digest || current.byteLength !== bytes.length || current.contentType !== contentType
        || current.attemptNonce !== bound!.attemptNonce || current.storageGeneration !== bound!.storageGeneration
        || !Array.isArray(authority.memory.get('sourceMedia'))
        || !authority.memory.get('sourceMedia').some((entry: unknown) => row(entry).mediaReceiptId === receiptId && row(entry).kind === value.kind)) fail('MEMORY_MEDIA_RECEIPT_UNAVAILABLE')
    })
    await requireAuthentication(); await check(); await requireAuthentication(); await check()
  }
  try {
    bound = await db.runTransaction(async transaction => {
      const [authority, old] = await Promise.all([readOwner(transaction, uid, memoryId), transaction.get(ref)])
      if (old.exists) {
        const r = receipt(old.data(), uid); sameAuthority(r, authority)
        if (r.sha256 !== digest || r.contentType !== contentType || r.byteLength !== bytes.length || r.state !== 'ready') fail('MEMORY_MEDIA_OPERATION_ALREADY_BOUND')
        return r
      }
      const attemptNonce = randomBytes(32).toString('hex')
      const r = { schemaVersion: SCHEMA, ownerUid: uid, memoryId, receiptId, sha256: digest, byteLength: bytes.length,
        kind: value.kind, contentType, bucketName: bucket.name, objectPath: objectPath(uid, memoryId, receiptId, digest, contentType), attemptNonce,
        consentRevision: authority.consentRevision, consentReceiptHash: authority.consentReceiptHash, consentExpiresAt: authority.consentExpiresAt,
        deletionGeneration: authority.deletionGeneration, state: 'uploading', leaseExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + UPLOAD_LEASE_MS),
        createdAt: admin.firestore.FieldValue.serverTimestamp() }
      await requireAuthentication()
      if (authority.consentExpiresAt <= Date.now()) fail('MEMORY_MEDIA_AUTHORITY_CHANGED')
      transaction.create(ref, r)
      claimed = true
      return receipt(r, uid)
    })
    await requireAuthentication()
    if (!claimed) {
      const [metadata] = await bucket.file(bound.objectPath, { generation: String(bound.storageGeneration) }).getMetadata()
      ownedMetadata(metadata as unknown as Row, bound, uid)
      if (String(metadata.generation) !== bound.storageGeneration || Number(metadata.size) !== bound.byteLength || metadata.contentType !== contentType) fail('MEMORY_MEDIA_OBJECT_AUTHORITY_CHANGED')
      await requireReady()
      return { receiptId, memoryId, state: 'ready', sha256: digest, byteLength: bytes.length, contentType }
    }
    await requireCurrent()
    const file = bucket.file(bound.objectPath)
    await file.save(bytes, { resumable: false, validation: 'crc32c', preconditionOpts: { ifGenerationMatch: 0 }, contentType,
      metadata: { metadata: { ownerHash: sha(uid), memoryHash: sha(memoryId), receiptId, attemptNonce: bound.attemptNonce, sourceSha256: digest } } })
    await requireCurrent()
    const [metadata] = await file.getMetadata()
    await requireCurrent()
    ownedMetadata(metadata as unknown as Row, bound, uid)
    if (Number(metadata.size) !== bytes.length || metadata.contentType !== contentType) fail('MEMORY_MEDIA_OBJECT_AUTHORITY_CHANGED')
    const storageGeneration = String(metadata.generation)
    await db.runTransaction(async transaction => {
      const [authority, current] = await Promise.all([readOwner(transaction, uid, memoryId), transaction.get(ref)])
      const r = receipt(current.data(), uid); sameAuthority(r, authority)
      if (r.state !== 'uploading' || r.attemptNonce !== bound!.attemptNonce || millis(r.leaseExpiresAt) <= Date.now()) fail('MEMORY_MEDIA_UPLOAD_LEASE_UNAVAILABLE')
      const existing = authority.memory.get('sourceMedia')
      if (existing !== undefined && !Array.isArray(existing)) fail('MEMORY_MEDIA_AUTHORITY_REQUIRED')
      const media = Array.isArray(existing) ? existing : []
      if (media.length >= 64) fail('MEMORY_MEDIA_RESOURCE_BUDGET_EXCEEDED')
      await requireAuthentication()
      if (authority.consentExpiresAt <= Date.now() || millis(r.leaseExpiresAt) <= Date.now()) fail('MEMORY_MEDIA_UPLOAD_LEASE_UNAVAILABLE')
      transaction.update(ref, { state: 'ready', storageGeneration, completedAt: admin.firestore.FieldValue.serverTimestamp() })
      transaction.update(authority.memory.ref, { sourceMedia: [...media, { kind: value.kind, mediaReceiptId: receiptId }] })
    })
    bound.storageGeneration = storageGeneration
    await requireReady()
    return { receiptId, memoryId, state: 'ready', sha256: digest, byteLength: bytes.length, contentType }
  } catch (error) {
    if (claimed && bound) {
      // Only this registered attempt can be fenced; never guess another object's ownership.
      // A failed acknowledgement after ready must preserve the committed source.
      const cleanup = await db.runTransaction(async transaction => {
        const current = await transaction.get(ref)
        if (!current.exists || current.get('state') === 'ready' || current.get('attemptNonce') !== bound!.attemptNonce) return false
        transaction.update(ref, { state: 'closing' })
        return true
      }).catch(() => false)
      if (cleanup) {
        try {
          const generation = await closeObject(bucket, uid, bound, async () => {
            const snap = await ref.get(); if (!snap.exists || snap.get('state') !== 'closing' || snap.get('attemptNonce') !== bound!.attemptNonce) fail('MEMORY_MEDIA_CLEANUP_AUTHORITY_CHANGED')
          }, cleanupLedger(db, uid, bound))
          await db.runTransaction(async transaction => { const snap = await transaction.get(ref); if (snap.exists && snap.get('attemptNonce') === bound!.attemptNonce && snap.get('state') === 'closing') transaction.update(ref, { state: 'aborted', tombstoneGeneration: generation, cleanupStatus: 'completed', permanentErasureProven: false }) })
        } catch { /* The registered lease stays visible for durable reconciliation/deletion. */ }
      }
    }
    throw error
  }
})

export function assertBoundMemoryMedia(memory: Row) {
  const media = memory.sourceMedia
  if (media !== undefined && !Array.isArray(media)) fail('MEMORY_MEDIA_AUTHORITY_REQUIRED')
  for (const entry of Array.isArray(media) ? media : []) {
    const m = row(entry)
    if (!SHA.test(String(m.mediaReceiptId)) || !['image', 'audio', 'video'].includes(String(m.kind))
      || Object.keys(m).some(key => !['mediaReceiptId', 'kind', 'caption'].includes(key))) fail('MEMORY_MEDIA_AUTHORITY_REQUIRED')
  }
  if (row(memory.replayManifest).audioUrl !== undefined) fail('MEMORY_MEDIA_AUTHORITY_REQUIRED')
}

export async function exportMemoryMediaBytes(database: FirebaseFirestore.Firestore, uid: string, memories: Row[], receipts: Row[],
  budget: ExportReadBudget, requireCurrent: () => Promise<unknown>) {
  const output: Row[] = [], authorities: Row[] = [], selected = new Set<string>(), bucket = admin.storage().bucket()
  const byId = new Map(receipts.map(r => [r.id, r]))
  for (const memory of memories) {
    assertBoundMemoryMedia(memory)
    for (const media of Array.isArray(memory.sourceMedia) ? memory.sourceMedia : []) {
      const binding = row(media), r = receipt(byId.get(String(binding.mediaReceiptId)), uid)
      if (selected.has(r.receiptId) || r.memoryId !== memory.id || r.state !== 'ready' || r.kind !== binding.kind
        || !/^[1-9][0-9]{0,39}$/.test(String(r.storageGeneration))) fail('MEMORY_MEDIA_RECEIPT_INVALID')
      selected.add(r.receiptId)
      const guard = async () => {
        requireExportReadBudget(budget); await requireCurrent()
        await database.runTransaction(async transaction => {
          const [authority, snap] = await Promise.all([readOwner(transaction, uid, r.memoryId), transaction.get(database.doc(`users/${uid}/memoryMediaReceipts/${r.receiptId}`))])
          const current = receipt(snap.data(), uid); sameAuthority(current, authority)
          if (current.state !== 'ready' || current.sha256 !== r.sha256 || current.storageGeneration !== r.storageGeneration
            || current.attemptNonce !== r.attemptNonce || !Array.isArray(authority.memory.get('sourceMedia'))
            || !authority.memory.get('sourceMedia').some((entry: unknown) => row(entry).mediaReceiptId === r.receiptId && row(entry).kind === r.kind)) fail('MEMORY_MEDIA_SOURCE_CHANGED')
        })
        await requireCurrent(); requireExportReadBudget(budget)
      }
      await guard()
      const file = bucket.file(r.objectPath, { generation: String(r.storageGeneration) }), [metadata] = await file.getMetadata()
      await guard()
      ownedMetadata(metadata as unknown as Row, r, uid)
      if (String(metadata.generation) !== r.storageGeneration || Number(metadata.size) !== r.byteLength || metadata.contentType !== r.contentType) fail('MEMORY_MEDIA_OBJECT_AUTHORITY_CHANGED')
      const bytes: Buffer[] = [], digest = createHash('sha256'); let length = 0
      const stream = file.createReadStream({ validation: 'crc32c' })
      try {
        for await (const incoming of stream) {
          const buffer = Buffer.from(incoming)
          for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
            await guard(); const chunk = buffer.subarray(offset, offset + 64 * 1024); length += chunk.length
            if (length > r.byteLength) fail('MEMORY_MEDIA_BYTES_CHANGED')
            bytes.push(chunk); digest.update(chunk)
          }
        }
      } finally { stream.destroy() }
      await guard()
      if (length !== r.byteLength || digest.digest('hex') !== r.sha256) fail('MEMORY_MEDIA_BYTES_CHANGED')
      const exported = { memoryId: r.memoryId, receiptId: r.receiptId, kind: r.kind, contentType: r.contentType,
        byteLength: length, sha256: r.sha256, sourceGeneration: r.storageGeneration, encoding: 'base64', bytesBase64: Buffer.concat(bytes).toString('base64') }
      chargeExportValue(budget, exported); output.push(exported)
      authorities.push(Object.fromEntries(['memoryId', 'receiptId', 'sha256', 'storageGeneration', 'attemptNonce', 'kind', 'contentType', 'bucketName',
        'byteLength', 'consentRevision', 'consentReceiptHash', 'consentExpiresAt', 'deletionGeneration'].map(key => [key, r[key]])))
    }
  }
  // Registered but uncommitted bytes are still owned work. An export must not
  // claim completeness by silently omitting an in-flight or orphaned source.
  for (const source of receipts) {
    const r = receipt(source, uid)
    if (source.id !== r.receiptId || ['uploading', 'closing'].includes(r.state)
      || (r.state === 'ready' && !selected.has(r.receiptId))
      || (['aborted', 'deleted'].includes(r.state) && r.cleanupStatus !== 'completed')) fail('MEMORY_MEDIA_SOURCE_NOT_EXPORTABLE')
  }
  return { rows: output, authorities }
}

// READY packages retain the original source's C1 authority separately from C7.
// The same check is used after build awaits and on every download continuation.
export async function verifyMemoryMediaExportAuthorities(transaction: FirebaseFirestore.Transaction, uid: string, value: unknown) {
  if (!Array.isArray(value) || Buffer.byteLength(JSON.stringify(value)) > 768 * 1024) fail('MEMORY_MEDIA_EXPORT_AUTHORITY_REQUIRED')
  const selected = new Set<string>(); let expiresAt = Number.MAX_SAFE_INTEGER
  for (const entry of value) {
    const binding = row(entry), memoryId = id(binding.memoryId), receiptId = String(binding.receiptId)
    if (!SHA.test(receiptId) || selected.has(receiptId)) fail('MEMORY_MEDIA_EXPORT_AUTHORITY_REQUIRED')
    selected.add(receiptId)
    const [authority, snapshot] = await Promise.all([readOwner(transaction, uid, memoryId),
      transaction.get(db.doc(`users/${uid}/memoryMediaReceipts/${receiptId}`))])
    const current = receipt(snapshot.data(), uid); sameAuthority(current, authority)
    const keys = ['memoryId', 'receiptId', 'sha256', 'storageGeneration', 'attemptNonce', 'kind', 'contentType', 'bucketName',
      'byteLength', 'consentRevision', 'consentReceiptHash', 'consentExpiresAt', 'deletionGeneration']
    if (current.state !== 'ready' || Object.keys(binding).length !== keys.length || keys.some(key => binding[key] !== current[key])
      || !Array.isArray(authority.memory.get('sourceMedia'))
      || !authority.memory.get('sourceMedia').some((source: unknown) => row(source).mediaReceiptId === receiptId && row(source).kind === current.kind)) fail('MEMORY_MEDIA_EXPORT_SOURCE_CHANGED')
    expiresAt = Math.min(expiresAt, authority.consentExpiresAt)
  }
  return expiresAt
}

// Called after the existing deletion job/fence is claimed, before deleting any
// memory or receipt. Conditional tombstones close all registered attempts,
// including an upload whose first Storage request has not returned yet.
export async function deleteMemoryMedia(database: FirebaseFirestore.Firestore, uid: string, requireCurrent: () => Promise<unknown>) {
  const bucket = admin.storage().bucket()
  let closed = 0
  for (const collectionName of ['memories', 'memoryMediaReceipts']) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined
    while (true) {
      await requireCurrent()
      let query = database.collection(`users/${uid}/${collectionName}`).orderBy(admin.firestore.FieldPath.documentId()).limit(250)
      if (cursor) query = query.startAfter(cursor)
      const page = await query.get(); await requireCurrent()
      if (!page.size) break
      for (const document of page.docs) {
        if (collectionName === 'memories') {
          const memory = document.data(); assertBoundMemoryMedia(memory)
          for (const binding of Array.isArray(memory.sourceMedia) ? memory.sourceMedia : []) {
            await requireCurrent()
            const reference = String(row(binding).mediaReceiptId)
            const source = await database.doc(`users/${uid}/memoryMediaReceipts/${reference}`).get()
            await requireCurrent()
            const r = receipt(source.data(), uid)
            if (r.receiptId !== reference || r.memoryId !== document.id || r.kind !== row(binding).kind
              || !(['ready', 'deleted', 'aborted'].includes(r.state)) || (r.state !== 'ready' && r.cleanupStatus !== 'completed')
              || !/^[1-9][0-9]{0,39}$/.test(String(r.storageGeneration))) fail('MEMORY_MEDIA_DELETION_SOURCE_UNACCOUNTED')
          }
          continue
        }
        const r = receipt(document.data(), uid)
        if (r.receiptId !== document.id) fail('MEMORY_MEDIA_DELETION_SOURCE_UNACCOUNTED')
        const generation = await closeObject(bucket, uid, r, requireCurrent, cleanupLedger(database, uid, r))
        await requireCurrent()
        closed++
        await database.runTransaction(async transaction => {
          const current = await transaction.get(document.ref)
          if (!current.exists || current.get('attemptNonce') !== r.attemptNonce) fail('MEMORY_MEDIA_CLEANUP_AUTHORITY_CHANGED')
          transaction.update(document.ref, { state: 'deleted', tombstoneGeneration: generation, cleanupStatus: 'completed', permanentErasureProven: false, deletedAt: admin.firestore.FieldValue.serverTimestamp() })
        })
        await requireCurrent()
      }
      cursor = page.docs[page.docs.length - 1]
      if (page.size < 250) break
    }
  }
  return closed
}

export const reconcileMemoryMediaUploads = functions.runWith({ timeoutSeconds: 180 }).pubsub.schedule('every 5 minutes').onRun(async () => {
  const stale = await db.collectionGroup('memoryMediaReceipts').where('state', 'in', ['uploading', 'closing'])
    .where('leaseExpiresAt', '<=', admin.firestore.Timestamp.fromMillis(Date.now())).limit(50).get()
  for (const snap of stale.docs) {
    const uid = id(snap.get('ownerUid')), r = receipt(snap.data(), uid)
    if (snap.ref.path !== `users/${uid}/memoryMediaReceipts/${r.receiptId}` || millis(r.leaseExpiresAt) > Date.now()) fail('MEMORY_MEDIA_CLEANUP_AUTHORITY_CHANGED')
    const claimed = await db.runTransaction(async transaction => {
      const current = await transaction.get(snap.ref)
      if (!current.exists || !['uploading', 'closing'].includes(String(current.get('state')))
        || current.get('attemptNonce') !== r.attemptNonce || millis(current.get('leaseExpiresAt')) > Date.now()) return false
      transaction.update(snap.ref, { state: 'closing' })
      return true
    })
    if (!claimed) continue
    const guard = async () => { const current = await snap.ref.get(); if (!current.exists || current.get('state') !== 'closing'
      || current.get('attemptNonce') !== r.attemptNonce || millis(current.get('leaseExpiresAt')) > Date.now()) fail('MEMORY_MEDIA_CLEANUP_AUTHORITY_CHANGED') }
    const generation = await closeObject(admin.storage().bucket(), uid, r, guard, cleanupLedger(db, uid, r))
    await db.runTransaction(async transaction => { const current = await transaction.get(snap.ref); if (current.exists && current.get('state') === 'closing'
      && current.get('attemptNonce') === r.attemptNonce && millis(current.get('leaseExpiresAt')) <= Date.now()) transaction.update(snap.ref, { state: 'aborted', tombstoneGeneration: generation, cleanupStatus: 'completed', permanentErasureProven: false }) })
  }
})
