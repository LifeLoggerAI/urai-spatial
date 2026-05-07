import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const projectId = `urai-spatial-rules-${Date.now()}`
const rules = fs.readFileSync(path.resolve('firebase/firestore.rules'), 'utf8')

function manifest(ownerId) {
  return {
    manifestId: 'manifest-a',
    manifestVersion: '1.0',
    jobId: 'job-a',
    ownerId,
    projectId: 'urai-spatial',
    assetType: 'memory image',
    artifacts: [],
    provider: 'test',
    model: 'rules-test',
    promptPreview: 'rules-test memory',
    spatialCompatibility: { supported: true, type: 'image_overlay' },
  }
}

let env

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  })

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'assetManifests', 'owned-manifest'), manifest('user-a'))
    await setDoc(doc(db, 'assetManifests', 'other-manifest'), manifest('user-b'))
    await setDoc(doc(db, 'assetManifests', 'launch-demo-manifest'), manifest('launch-demo'))
  })
})

test.after(async () => {
  if (env) await env.cleanup()
})

test('asset manifest owner can read own manifest', async () => {
  const db = env.authenticatedContext('user-a').firestore()
  await assertSucceeds(getDoc(doc(db, 'assetManifests', 'owned-manifest')))
})

test('asset manifest owner cannot read another private manifest', async () => {
  const db = env.authenticatedContext('user-a').firestore()
  await assertFails(getDoc(doc(db, 'assetManifests', 'other-manifest')))
})

test('unauthenticated user can read launch demo manifest', async () => {
  const db = env.unauthenticatedContext().firestore()
  await assertSucceeds(getDoc(doc(db, 'assetManifests', 'launch-demo-manifest')))
})

test('unauthenticated user cannot read private manifest', async () => {
  const db = env.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'assetManifests', 'owned-manifest')))
})

test('admin can read and write valid manifests', async () => {
  const db = env.authenticatedContext('admin-a', { admin: true }).firestore()
  await assertSucceeds(getDoc(doc(db, 'assetManifests', 'other-manifest')))
  await assertSucceeds(setDoc(doc(db, 'assetManifests', 'admin-created'), manifest('user-c')))
  await assertSucceeds(updateDoc(doc(db, 'assetManifests', 'admin-created'), { assetType: 'memory video' }))
  await assertSucceeds(deleteDoc(doc(db, 'assetManifests', 'admin-created')))
})

test('client cannot create update or delete manifests', async () => {
  const db = env.authenticatedContext('user-a').firestore()
  await assertFails(setDoc(doc(db, 'assetManifests', 'client-created'), manifest('user-a')))
  await assertFails(updateDoc(doc(db, 'assetManifests', 'owned-manifest'), { assetType: 'tampered' }))
  await assertFails(deleteDoc(doc(db, 'assetManifests', 'owned-manifest')))
})

test('rules file contains explicit assetManifests boundary', () => {
  assert.match(rules, /match \/assetManifests\/\{manifestId\}/)
})
