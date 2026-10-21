import * as admin from 'firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import * as functions from 'firebase-functions/v1'
import { createHash } from 'node:crypto'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'
import { parsePreparedFirstPrivateMemory } from './firstPrivateMemoryPacket'
import { resolveMemoryMediaProject } from './memoryMediaProjectBoundary'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const ID = /^[A-Za-z0-9_-]{1,128}$/
const SHA = /^[a-f0-9]{64}$/
const hash = (s: string) => createHash('sha256').update(s).digest('hex')
type Row = Record<string, unknown>
function fail(code: string): never { throw new functions.https.HttpsError('failed-precondition', code) }
function asRow(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {} }
function strictKeys(row: Row, allowed: string[]) { return Object.keys(row).length === allowed.length && Object.keys(row).every(k => allowed.includes(k)) }
function expiration(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value ? Date.parse(value) : NaN
}
function authenticatedOwner(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid || !ID.test(uid)) throw new functions.https.HttpsError('unauthenticated', 'Authenticated owner required.')
  const raw = context.rawRequest?.get('authorization')
  const bearer = typeof raw === 'string' && /^Bearer [^\s]+$/.test(raw) ? raw.slice(7) : ''
  const verify = async () => {
    if (!bearer) throw new functions.https.HttpsError('unauthenticated', 'Fresh owner bearer required.')
    const token = await admin.auth().verifyIdToken(bearer, true)
    const now = Math.floor(Date.now() / 1000)
    if (token.uid !== uid || !Number.isSafeInteger(token.auth_time) || token.auth_time <= 0
      || token.auth_time > now || now - token.auth_time > 300) {
      throw new functions.https.HttpsError('unauthenticated', 'Recent owner authentication required.')
    }
  }
  return { uid, verify }
}

/** Per-call owner confirmation is intentionally outside the offline packet: offline preparation
 * never establishes individual memory consent. The server must also prove current C1 and
 * deletion authorities in the same Firestore transaction that creates the memory. */
export const createFirstPrivateMemory = functions.https.onCall(async (data, context) => {
  try { resolveMemoryMediaProject(process.env) } catch { fail('FIRST_PRIVATE_MEMORY_PROJECT_UNBOUND') }
  const { uid, verify } = authenticatedOwner(context)
  const input = asRow(data), approval = asRow(input.ownerConfirmation)
  if (!strictKeys(input, ['packet', 'ownerConfirmation'])
    || !strictKeys(approval, ['authorize', 'memoryId', 'derivativeSha256', 'visibility'])
    || approval.authorize !== true || approval.visibility !== 'hidden') fail('FIRST_PRIVATE_MEMORY_OWNER_CONFIRMATION_REQUIRED')
  await verify()
  let parsed: ReturnType<typeof parsePreparedFirstPrivateMemory>
  try { parsed = parsePreparedFirstPrivateMemory(input.packet, uid) }
  catch { fail('FIRST_PRIVATE_MEMORY_PACKET_INVALID') }
  const memoryId = parsed.memoryId, provenance = asRow(parsed.memory.sourceProvenance)
  if (approval.memoryId !== memoryId || approval.derivativeSha256 !== provenance.derivativeSha256
    || !SHA.test(String(provenance.derivativeSha256))) fail('FIRST_PRIVATE_MEMORY_OWNER_CONFIRMATION_REQUIRED')
  const memoryRef = db.doc(`users/${uid}/memories/${memoryId}`)
  await verify()
  await db.runTransaction(async transaction => {
    const [user, existing, policy, consent, central, local, deletions, barrier, permanent, consentBlock] = await Promise.all([
      transaction.get(db.doc(`users/${uid}`)), transaction.get(memoryRef),
      transaction.get(db.doc(`users/${uid}/privacyPolicy/current`)), transaction.get(db.doc(`consentRecords/${uid}_memory_storage`)),
      transaction.get(db.doc(`privacyDeletionTombstones/${uid}`)), transaction.get(db.doc(`users/${uid}/privacyRuntime/exportAuthority`)),
      transaction.get(db.collection(`users/${uid}/deletionJobs`).where('state', 'in', ['awaiting-grace', 'queued', 'in-progress', 'failed']).limit(1)),
      transaction.get(db.doc(`privateLifeModelOwnerBarriers/${hash(uid)}`)), transaction.get(db.doc(`uraiPrivateLifeModelOwnerFences/${hash(uid)}`)),
      transaction.get(db.doc(`jobConsentBlocks/${hash(uid + '\n' + 'memory.storage')}`)),
    ])
    const p = policy.data(), c = consent.data(), generation = local.exists ? local.get('generation') : 0
    const pending = local.get('pendingDeletions'), expiresAt = expiration(c?.expiresAt)
    if (!user.exists || user.get('deleted') === true || ['deleting', 'deleted', 'disabled'].includes(String(user.get('accountStatus')))
      || !policy.exists || !isCanonicalStoredPolicy(p, uid) || p.revision < 1
      || p.domains.memory.mode !== 'granted' || p.enforcement.state !== 'fully-enforced'
      || !consent.exists || c?.uid !== uid || c.purpose !== 'memory.storage' || c.consentTier !== 'C1'
      || c.policyVersion !== '1.0.0' || c.status !== 'granted' || !SHA.test(String(c.receiptHash))
      || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()
      || !Number.isSafeInteger(generation) || generation < 0 || (local.exists && (!pending || typeof pending !== 'object' || Array.isArray(pending)))
      || (pending && Object.keys(pending).length > 0) || !deletions.empty
      || barrier.get('blocked') === true) fail('FIRST_PRIVATE_MEMORY_CURRENT_AUTHORITY_REQUIRED')
    if (central.exists) {
      const marker = central.data() ?? {}, keys = Object.keys(marker)
      const released = !keys.includes('active') && keys.every(key => ['uid', 'updatedAt'].includes(key))
        && marker.updatedAt instanceof Timestamp
      const exportProjection = !keys.includes('active') && keys.every(key => ['uid', 'updatedAt', 'exportConsentStatus',
        'exportConsentReceiptHash', 'exportConsentPolicyVersion', 'exportConsentExpiresAt'].includes(key))
        && ['granted', 'revoked'].includes(String(marker.exportConsentStatus))
        && SHA.test(String(marker.exportConsentReceiptHash)) && marker.exportConsentPolicyVersion === '1.0.0'
        && Number.isSafeInteger(expiration(marker.exportConsentExpiresAt))
      if (marker.uid !== uid || keys.some(key => key.startsWith('deletionPlanningLease'))
        || (marker.active !== false && !released && !exportProjection)) fail('FIRST_PRIVATE_MEMORY_CURRENT_AUTHORITY_REQUIRED')
    }
    if (permanent.exists && (permanent.get('ownerHash') !== hash(uid) || permanent.get('deleted') !== false
      || permanent.get('deletionEpoch') !== 0)) fail('FIRST_PRIVATE_MEMORY_CURRENT_AUTHORITY_REQUIRED')
    if (consentBlock.exists && (consentBlock.get('ownerUid') !== uid || consentBlock.get('purpose') !== 'memory.storage'
      || consentBlock.get('active') !== false)) fail('FIRST_PRIVATE_MEMORY_CURRENT_AUTHORITY_REQUIRED')
    // create() is deliberately non-overwriting: duplicate IDs cannot rewrite a person's source,
    // consent, chronology, or existing private media during a retry.
    if (existing.exists) fail('FIRST_PRIVATE_MEMORY_ALREADY_EXISTS')
    await verify()
    if (expiresAt <= Date.now()) fail('FIRST_PRIVATE_MEMORY_CURRENT_AUTHORITY_REQUIRED')
    transaction.create(memoryRef, {
      ...parsed.memory,
      createdAt: FieldValue.serverTimestamp(),
      firstPrivateMemoryConsent: {
        status: 'explicit-owner-confirmation', ownerId: uid, memoryId,
        derivativeSha256: provenance.derivativeSha256,
        canonicalConsentReceiptHash: c.receiptHash, consentRevision: p.revision,
        confirmedAt: FieldValue.serverTimestamp(),
      },
    })
  })
  // Once the transaction commits, report its result; a later session change does not
  // retroactively invalidate the committed write or turn success into a retry error.
  return { memoryId, ownerId: uid, visibility: 'hidden', state: 'created-without-media' }
})
