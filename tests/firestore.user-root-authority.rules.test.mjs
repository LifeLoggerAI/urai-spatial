import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

// Run ONLY against the dedicated Firebase Firestore emulator.
const projectId = 'urai-user-root-authority-' + Date.now()
const rules = fs.readFileSync('firebase/firestore.rules', 'utf8')
const ownerId = 'user-root-owner-a'
const fields = ['entitlementTier', 'isAdmin', 'founderOverride', 'deleted', 'accountStatus', 'privacyRevision']
const fakeValue = {
  entitlementTier: 'founder', isAdmin: true, founderOverride: true,
  deleted: false, accountStatus: 'active', privacyRevision: 999,
}
let env

test.before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules } })
})
test.after(async () => {
  if (env) await env.cleanup()
})

test('owner cannot create user profile with forged privilege or privacy/deletion authority', async () => {
  const db = env.authenticatedContext(ownerId).firestore()
  const ref = doc(db, 'users', ownerId)
  for (const field of fields) {
    await assertFails(setDoc(ref, { displayName: 'Owner', [field]: fakeValue[field] }))
  }
  await assertSucceeds(setDoc(ref, { displayName: 'Owner' }))
  assert.equal((await getDoc(ref)).data()?.displayName, 'Owner')
})

test('owner cannot add authoritative fields to an existing user profile', async () => {
  const ref = doc(env.authenticatedContext(ownerId).firestore(), 'users', ownerId)
  for (const field of fields) {
    await assertFails(updateDoc(ref, { [field]: fakeValue[field] }))
  }
  await assertSucceeds(updateDoc(ref, { displayName: 'Edited by owner' }))
})

test('owner cannot change or remove existing server-owned account fields', async () => {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'users', ownerId), {
    displayName: 'Owner', entitlementTier: 'free', isAdmin: false,
    founderOverride: false, deleted: false, accountStatus: 'active', privacyRevision: 5,
  }))
  const ref = doc(env.authenticatedContext(ownerId).firestore(), 'users', ownerId)
  const changed = { ...fakeValue, deleted: true, accountStatus: 'deleting', privacyRevision: 6 }
  for (const field of fields) {
    await assertFails(updateDoc(ref, { [field]: changed[field] }))
    await assertFails(updateDoc(ref, { [field]: deleteField() }))
  }
  await assertSucceeds(updateDoc(ref, { displayName: 'Still allowed' }))
  assert.equal((await getDoc(ref)).data()?.privacyRevision, 5)
  assert.equal((await getDoc(ref)).data()?.accountStatus, 'active')
})

test('foreign account cannot update owner profile despite being signed in', async () => {
  const ref = doc(env.authenticatedContext('user-root-other-b').firestore(), 'users', ownerId)
  await assertFails(updateDoc(ref, { displayName: 'Forged' }))
})
