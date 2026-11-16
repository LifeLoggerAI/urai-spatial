import fs from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'

const projectId = `urai-privacy-rules-${Date.now()}`
const rules = fs.readFileSync(path.resolve('firebase/firestore.rules'), 'utf8')
const ownerId = 'privacy-owner-a'
const otherOwnerId = 'privacy-owner-b'

let env

const ownerDocuments = [
  ['privacyPolicy', 'current', { ownerId, version: 2, revision: 3 }],
  ['privacyRuntime', 'location-precision', { ownerId, enabled: false }],
  ['privacyAudit', 'audit-a', { ownerId, result: 'fully-enforced' }],
  ['privacyReceipts', 'receipt-a', { ownerId, result: 'fully-enforced' }],
  ['capturedRealityAssets', 'asset-a', { ownerId, state: 'ready', releaseState: 'private-pilot', revocationState: 'active' }],
  ['exportJobs', 'export-a', { uid: ownerId, state: 'ready' }],
  ['deletionJobs', 'deletion-a', { uid: ownerId, state: 'queued' }],
  ['dataSources', 'source-a', { ownerId, status: 'active' }],
  ['devices', 'device-a', { ownerId, status: 'active' }],
  ['providerConnections', 'provider-a', { ownerId, status: 'active' }],
  ['memories', 'memory-a', { ownerId, title: 'Private memory', occurredAt: '2026-09-29T00:00:00.000Z' }],
  ['lifeMovies', 'movie-a', { ownerId, id: 'movie-a', version: 1, status: 'ready', chapters: [] }],
]

test.before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules } })
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    for (const [collectionName, documentId, payload] of ownerDocuments) {
      await setDoc(doc(db, 'users', ownerId, collectionName, documentId), payload)
      await setDoc(doc(db, 'users', otherOwnerId, collectionName, documentId), {
        ...payload,
        ownerId: otherOwnerId,
        uid: otherOwnerId,
      })
    }
    await setDoc(doc(db, 'privacyEnforcementJobs', 'job-a'), { uid: ownerId, state: 'requested' })
    await setDoc(doc(db, 'providerRevocationQueue', 'provider-a'), { uid: ownerId, state: 'requested' })
    await setDoc(doc(db, 'deletionQueue', 'deletion-a'), { uid: ownerId, state: 'queued' })
    await setDoc(doc(db, 'deletionReceipts', 'receipt-a'), { ownerDigest: 'digest', result: 'completed' })
  })
})

test.after(async () => {
  if (env) await env.cleanup()
})

test('owner can read every owner-scoped privacy lifecycle record', async () => {
  const db = env.authenticatedContext(ownerId).firestore()
  for (const [collectionName, documentId] of ownerDocuments) {
    await assertSucceeds(getDoc(doc(db, 'users', ownerId, collectionName, documentId)))
  }
})

test('signed-out and cross-user reads fail closed', async () => {
  const signedOut = env.unauthenticatedContext().firestore()
  const other = env.authenticatedContext(otherOwnerId).firestore()
  for (const [collectionName, documentId] of ownerDocuments) {
    const ref = doc(signedOut, 'users', ownerId, collectionName, documentId)
    await assertFails(getDoc(ref))
    await assertFails(getDoc(doc(other, 'users', ownerId, collectionName, documentId)))
  }
})

test('administrative client claims cannot read full private memory records', async () => {
  const adminDb = env.authenticatedContext('admin-a', { admin: true }).firestore()
  await assertFails(getDoc(doc(adminDb, 'users', ownerId, 'memories', 'memory-a')))
  await assertFails(getDoc(doc(adminDb, 'users', ownerId, 'lifeMovies', 'movie-a')))
})

test('clients cannot mutate trusted privacy authority or lifecycle records', async () => {
  const db = env.authenticatedContext(ownerId).firestore()
  for (const [collectionName, documentId] of ownerDocuments) {
    const existing = doc(db, 'users', ownerId, collectionName, documentId)
    await assertFails(updateDoc(existing, { tampered: true }))
    await assertFails(deleteDoc(existing))
    await assertFails(setDoc(doc(db, 'users', ownerId, collectionName, 'client-created'), { ownerId }))
  }
})

test('trusted queues and durable deletion receipts are never client-accessible', async () => {
  for (const db of [
    env.unauthenticatedContext().firestore(),
    env.authenticatedContext(ownerId).firestore(),
    env.authenticatedContext('admin-a', { admin: true }).firestore(),
  ]) {
    for (const [collectionName, documentId] of [
      ['privacyEnforcementJobs', 'job-a'],
      ['providerRevocationQueue', 'provider-a'],
      ['deletionQueue', 'deletion-a'],
      ['deletionReceipts', 'receipt-a'],
    ]) {
      const ref = doc(db, collectionName, documentId)
      await assertFails(getDoc(ref))
      await assertFails(setDoc(doc(db, collectionName, 'client-created'), { state: 'forged' }))
      await assertFails(updateDoc(ref, { state: 'forged' }))
      await assertFails(deleteDoc(ref))
    }
  }
})

// Proposed C1 boundary cases; not current accepted access policy.
const canonicalConsent = (uid, overrides = {}) => ({
  uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0',
  status: 'granted', receiptHash: 'b'.repeat(64), expiresAt: Date.now() + 600000,
  ...overrides,
})
async function seedC1(uid, overrides = {}, documentId = uid + '_memory_storage') {
  await env.withSecurityRulesDisabled(context =>
    setDoc(doc(context.firestore(), 'consentRecords', documentId), canonicalConsent(uid, overrides)))
}
test('owner can get only its canonical C1 record, including withdrawn status', async () => {
  const ref = doc(env.authenticatedContext(ownerId).firestore(), 'consentRecords', ownerId + '_memory_storage')
  await seedC1(ownerId)
  assert.equal((await assertSucceeds(getDoc(ref))).data().status, 'granted')
  await seedC1(ownerId, { status: 'revoked' })
  assert.equal((await assertSucceeds(getDoc(ref))).data().status, 'revoked')
})
test('real owner SDK subscription observes canonical hash, expiry and status changes', async () => {
  await seedC1(ownerId)
  const ref = doc(env.authenticatedContext(ownerId).firestore(), 'consentRecords', ownerId + '_memory_storage')
  let current, waiting, rejectWaiting
  const stop = onSnapshot(ref, snapshot => {
    current = snapshot.data()
    waiting?.()
  }, error => rejectWaiting?.(error))
  const waitFor = predicate => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Canonical C1 snapshot did not arrive')), 10000)
    waiting = () => { if (predicate(current)) { clearTimeout(timeout); resolve(current) } }
    rejectWaiting = error => { clearTimeout(timeout); reject(error) }
    waiting()
  })
  try {
    await waitFor(value => value?.status === 'granted')
    await seedC1(ownerId, { receiptHash: 'e'.repeat(64) })
    await waitFor(value => value?.receiptHash === 'e'.repeat(64))
    const expired = Date.now() - 1
    await seedC1(ownerId, { expiresAt: expired })
    await waitFor(value => value?.expiresAt === expired)
    await seedC1(ownerId, { status: 'revoked' })
    await waitFor(value => value?.status === 'revoked')
  } finally { stop() }
})
test('canonical C1 get denies anonymous, foreign and administrative clients', async () => {
  await seedC1(ownerId)
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext(otherOwnerId),
    env.authenticatedContext('admin-a', { admin: true }),
    env.authenticatedContext('founder-a', { founder: true }),
  ]) await assertFails(getDoc(doc(context.firestore(), 'consentRecords', ownerId + '_memory_storage')))
})
test('C1 reads require canonical document identity, uid, purpose, tier and version', async () => {
  const db = env.authenticatedContext(ownerId).firestore()
  await seedC1(ownerId, {}, ownerId + '_other_purpose')
  await assertFails(getDoc(doc(db, 'consentRecords', ownerId + '_other_purpose')))
  for (const invalid of [
    { uid: otherOwnerId }, { purpose: 'data.export' },
    { consentTier: 'C2' }, { policyVersion: '2.0.0' },
  ]) {
    await seedC1(ownerId, invalid)
    await assertFails(getDoc(doc(db, 'consentRecords', ownerId + '_memory_storage')))
  }
  await seedC1(otherOwnerId)
  await assertFails(getDoc(doc(db, 'consentRecords', otherOwnerId + '_memory_storage')))
})
test('C1 collection queries remain denied even when filtered to the owner', async () => {
  await seedC1(ownerId)
  const db = env.authenticatedContext(ownerId).firestore()
  await assertFails(getDocs(collection(db, 'consentRecords')))
  await assertFails(getDocs(query(collection(db, 'consentRecords'), where('uid', '==', ownerId))))
})
test('owners, anonymous, foreign and administrative clients cannot create, update or delete C1 authority', async () => {
  await seedC1(ownerId)
  for (const context of [
    env.authenticatedContext(ownerId),
    env.unauthenticatedContext(),
    env.authenticatedContext(otherOwnerId),
    env.authenticatedContext('admin-a', { admin: true }),
  ]) {
    const db = context.firestore(), ref = doc(db, 'consentRecords', ownerId + '_memory_storage')
    await assertFails(updateDoc(ref, { status: 'granted', receiptHash: 'f'.repeat(64) }))
    await assertFails(deleteDoc(ref))
    await assertFails(setDoc(doc(db, 'consentRecords', 'client_created_memory_storage'), canonicalConsent(ownerId)))
  }
  // Also test owner creation at the exact canonical path, not only noncanonical writes.
  await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), 'consentRecords', ownerId + '_memory_storage')))
  await assertFails(setDoc(doc(env.authenticatedContext(ownerId).firestore(), 'consentRecords', ownerId + '_memory_storage'), canonicalConsent(ownerId)))
})
