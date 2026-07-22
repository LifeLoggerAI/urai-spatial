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

let env

const ownerDocuments = [
  ['privacyPolicy', 'current', { ownerId, version: 2, revision: 3 }],
  ['privacyRuntime', 'location-precision', { ownerId, enabled: false }],
  ['privacyAudit', 'audit-a', { ownerId, result: 'fully-enforced' }],
  ['privacyReceipts', 'receipt-a', { ownerId, result: 'fully-enforced' }],
  ['exportJobs', 'export-a', { uid: ownerId, state: 'ready' }],
  ['deletionJobs', 'deletion-a', { uid: ownerId, state: 'queued' }],
  ['dataSources', 'source-a', { ownerId, status: 'active' }],
  ['devices', 'device-a', { ownerId, status: 'active' }],
  ['providerConnections', 'provider-a', { ownerId, status: 'active' }],
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
