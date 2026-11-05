import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const projectId = `urai-life-model-rules-${Date.now()}`
const rules = fs.readFileSync(path.resolve('firebase/firestore.rules'), 'utf8')
const ownerId = 'life-model-owner-a'
const otherOwnerId = 'life-model-owner-b'

let env

const lifeModelDocuments = [
  ['lifeEntities', 'person-a', { ownerId, id: 'person-a', kind: 'person', state: 'current' }],
  ['lifeEntityStates', 'person-a-state-1', { ownerId, entityId: 'person-a', state: 'current' }],
  ['lifeClaims', 'claim-a', { ownerId, subjectEntityId: 'person-a', state: 'current', synthetic: false }],
  ['lifeRelationships', 'relationship-a', { ownerId, fromEntityId: 'person-a', toEntityId: 'place-a', state: 'current' }],
  ['lifeEvents', 'event-a', { ownerId, state: 'current', synthetic: false }],
  ['lifeCorrections', 'correction-a', { ownerId, state: 'applied' }],
  ['lifeConflicts', 'conflict-a', { ownerId, state: 'open' }],
  ['knowledgeGaps', 'gap-a', { ownerId, state: 'open' }],
  ['personModelBundles', 'bundle-a', { ownerId, personId: 'person-a', state: 'current', synthetic: false }],
  ['sceneTruthPackets', 'scene-a', { ownerId, state: 'current', syntheticOutputMayBecomeHistoricalSource: false }],
  ['renderManifests', 'render-a', { ownerId, state: 'current' }],
  ['simulationSessions', 'session-a', { ownerId, state: 'active' }],
  ['lifeModelReceipts', 'receipt-a', { ownerId, result: 'accepted' }],
]

test.before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules } })
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    for (const [collectionName, documentId, payload] of lifeModelDocuments) {
      await setDoc(doc(db, 'users', ownerId, collectionName, documentId), payload)
      await setDoc(doc(db, 'users', otherOwnerId, collectionName, documentId), {
        ...payload,
        ownerId: otherOwnerId,
      })
    }
  })
})

test.after(async () => {
  if (env) await env.cleanup()
})

test('Life Model owner can read every server-authoritative model record', async () => {
  const db = env.authenticatedContext(ownerId).firestore()
  for (const [collectionName, documentId] of lifeModelDocuments) {
    await assertSucceeds(getDoc(doc(db, 'users', ownerId, collectionName, documentId)))
  }
})

test('Life Model records fail closed to signed-out, cross-user, and client-admin reads', async () => {
  const contexts = [
    env.unauthenticatedContext().firestore(),
    env.authenticatedContext(otherOwnerId).firestore(),
    env.authenticatedContext('admin-a', { admin: true }).firestore(),
  ]
  for (const db of contexts) {
    for (const [collectionName, documentId] of lifeModelDocuments) {
      await assertFails(getDoc(doc(db, 'users', ownerId, collectionName, documentId)))
    }
  }
})

test('Life Model collections reject all client create, update, and delete operations', async () => {
  const contexts = [
    env.authenticatedContext(ownerId).firestore(),
    env.authenticatedContext(otherOwnerId).firestore(),
    env.authenticatedContext('admin-a', { admin: true }).firestore(),
  ]
  for (const db of contexts) {
    for (const [collectionName, documentId] of lifeModelDocuments) {
      const existing = doc(db, 'users', ownerId, collectionName, documentId)
      const forged = doc(db, 'users', ownerId, collectionName, 'client-forged')
      await assertFails(setDoc(forged, { ownerId, state: 'forged' }))
      await assertFails(updateDoc(existing, { state: 'forged' }))
      await assertFails(deleteDoc(existing))
    }
  }
})
