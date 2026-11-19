import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const projectId = `urai-privacy-rules-${Date.now()}`
const rules = fs.readFileSync(path.resolve('firebase/firestore.rules'), 'utf8')
const ownerId = 'privacy-owner-a'
const otherOwnerId = 'privacy-owner-b'
const orphanOwnerId = 'privacy-owner-orphan'
const fencedOwnerId = 'privacy-owner-fenced'

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
    await setDoc(doc(db, 'users', ownerId), { uid: ownerId, state: 'active' })
    await setDoc(doc(db, 'users', otherOwnerId), { uid: otherOwnerId, state: 'active' })
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
      ['accountDeletionFences', ownerId],
    ]) {
      const ref = doc(db, collectionName, documentId)
      await assertFails(getDoc(ref))
      await assertFails(setDoc(doc(db, collectionName, 'client-created'), { state: 'forged' }))
      await assertFails(updateDoc(ref, { state: 'forged' }))
      await assertFails(deleteDoc(ref))
    }
  }
})


test('authenticated owner can create the parent user record before active-self reads begin', async () => {
  const freshOwnerId = 'privacy-owner-fresh'
  const db = env.authenticatedContext(freshOwnerId).firestore()
  await assertSucceeds(setDoc(doc(db, 'users', freshOwnerId), { uid: freshOwnerId, state: 'active' }))
})

test('old owner identity cannot read an orphaned private child after the parent user record is removed', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', orphanOwnerId), { uid: orphanOwnerId, state: 'active' })
    await setDoc(doc(db, 'users', orphanOwnerId, 'memories', 'survivor'), { ownerId: orphanOwnerId, title: 'Synthetic survivor' })
    await deleteDoc(doc(db, 'users', orphanOwnerId))
  })
  const db = env.authenticatedContext(orphanOwnerId).firestore()
  await assertFails(getDoc(doc(db, 'users', orphanOwnerId, 'memories', 'survivor')))
})


test('account deletion fence denies owner reads even while parent and private child still exist', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', fencedOwnerId), { uid: fencedOwnerId, state: 'active' })
    await setDoc(doc(db, 'users', fencedOwnerId, 'memories', 'survivor'), { ownerId: fencedOwnerId, title: 'Synthetic survivor' })
    await setDoc(doc(db, 'accountDeletionFences', fencedOwnerId), { uid: fencedOwnerId, state: 'revoked' })
  })
  const db = env.authenticatedContext(fencedOwnerId).firestore()
  await assertFails(getDoc(doc(db, 'users', fencedOwnerId, 'memories', 'survivor')))
  await assertFails(getDoc(doc(db, 'users', fencedOwnerId)))
  await assertFails(getDoc(doc(db, 'accountDeletionFences', fencedOwnerId)))
  await env.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), 'users', fencedOwnerId))
  })
  await assertFails(setDoc(doc(db, 'users', fencedOwnerId), { uid: fencedOwnerId, state: 'recreated' }))
})
