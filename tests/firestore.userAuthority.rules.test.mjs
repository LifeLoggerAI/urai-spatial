import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

// Real Firestore Rules emulator tests; these must not be replaced by static mocks.
const projectId = 'urai-owner-profile-rules-' + Date.now()
const rules = fs.readFileSync(path.resolve('firebase/firestore.rules'), 'utf8')
const ownerId = 'profile-owner-a'
const otherOwnerId = 'profile-owner-b'
const protectedValues = {
  entitlementTier: 'enterprise',
  isAdmin: true,
  founderOverride: true,
  deleted: true,
  accountStatus: 'active',
}
let env

const profile = (database) => doc(database, 'users', ownerId)
const seed = (data) => env.withSecurityRulesDisabled((context) => setDoc(profile(context.firestore()), data))
const clear = () => env.withSecurityRulesDisabled((context) => deleteDoc(profile(context.firestore())))

test.before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules } })
})
test.after(async () => {
  if (env) await env.cleanup()
})

test('owner may create a normal profile but cannot create privileged account fields', async () => {
  await clear()
  const db = env.authenticatedContext(ownerId).firestore()
  const reference = profile(db)
  for (const [field, value] of Object.entries(protectedValues)) {
    await assertFails(setDoc(reference, { displayName: 'Profile', [field]: value }))
  }
  await assertSucceeds(setDoc(reference, { displayName: 'Profile', timezone: 'UTC' }))
})

test('owner may update ordinary profile data while retaining server-established authority', async () => {
  await seed({ displayName: 'Original', ...protectedValues, isAdmin: false, founderOverride: false, deleted: false })
  const reference = profile(env.authenticatedContext(ownerId).firestore())
  await assertSucceeds(updateDoc(reference, { displayName: 'Changed', timezone: 'UTC' }))
  const result = (await assertSucceeds(getDoc(reference))).data()
  assert.equal(result.displayName, 'Changed')
  assert.equal(result.entitlementTier, 'enterprise')
  assert.equal(result.isAdmin, false)
  assert.equal(result.deleted, false)
  assert.equal(result.accountStatus, 'active')
})

test('owner cannot ADD a privileged field to a legacy profile', async () => {
  await seed({ displayName: 'Legacy' })
  const reference = profile(env.authenticatedContext(ownerId).firestore())
  for (const [field, value] of Object.entries(protectedValues)) {
    await assertFails(updateDoc(reference, { [field]: value }))
  }
})

test('owner cannot MODIFY or REMOVE server-controlled fields', async () => {
  await seed({ displayName: 'Verified', entitlementTier: 'free', isAdmin: false, founderOverride: false, deleted: false, accountStatus: 'active' })
  const reference = profile(env.authenticatedContext(ownerId).firestore())
  for (const [field, value] of Object.entries(protectedValues)) {
    const nextValue = field === 'accountStatus' ? 'deleted' : value
    await assertFails(updateDoc(reference, { [field]: nextValue }))
    await assertFails(updateDoc(reference, { [field]: deleteField() }))
  }
  const current = (await assertSucceeds(getDoc(reference))).data()
  assert.equal(current.entitlementTier, 'free')
  assert.equal(current.isAdmin, false)
  assert.equal(current.deleted, false)
  assert.equal(current.accountStatus, 'active')
})

test('owner, foreign users, signed-out clients, and token-only admins cannot delete or take over an owner profile', async () => {
  await seed({ displayName: 'Private profile' })
  const owner = profile(env.authenticatedContext(ownerId).firestore())
  await assertFails(deleteDoc(owner))
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext(otherOwnerId),
    env.authenticatedContext('token-admin-a', { admin: true }),
  ]) {
    const reference = profile(context.firestore())
    await assertFails(updateDoc(reference, { displayName: 'Tampered' }))
    await assertFails(deleteDoc(reference))
  }
})

test('full-document setDoc overwrite cannot strip an established server authority field', async () => {
  await seed({ displayName: 'Server-established', entitlementTier: 'pro', isAdmin: false,
    founderOverride: false, deleted: false, accountStatus: 'active' })
  const reference = profile(env.authenticatedContext(ownerId).firestore())
  for (const field of Object.keys(protectedValues)) {
    const retained = { displayName: 'Attempted overwrite', entitlementTier: 'pro',
      isAdmin: false, founderOverride: false, deleted: false, accountStatus: 'active' }
    delete retained[field]
    await assertFails(setDoc(reference, retained))
  }
  await assertSucceeds(setDoc(reference, { displayName: 'Legitimate overwrite',
    entitlementTier: 'pro', isAdmin: false, founderOverride: false, deleted: false,
    accountStatus: 'active' }))
  const current = (await assertSucceeds(getDoc(reference))).data()
  assert.equal(current.displayName, 'Legitimate overwrite')
  assert.equal(current.accountStatus, 'active')
})

test('setDoc merge cannot add or modify protected fields, but normal owner merge remains available', async () => {
  const reference = profile(env.authenticatedContext(ownerId).firestore())
  await seed({ displayName: 'Legacy' })
  for (const [field, value] of Object.entries(protectedValues)) {
    await assertFails(setDoc(reference, { [field]: value }, { merge: true }))
  }
  await seed({ displayName: 'Verified', entitlementTier: 'free', isAdmin: false,
    founderOverride: false, deleted: false, accountStatus: 'active' })
  for (const [field, value] of Object.entries(protectedValues)) {
    const changed = field === 'accountStatus' ? 'disabled' : value
    await assertFails(setDoc(reference, { [field]: changed }, { merge: true }))
  }
  await assertSucceeds(setDoc(reference, { displayName: 'Permitted merge' }, { merge: true }))
  const current = (await assertSucceeds(getDoc(reference))).data()
  assert.equal(current.displayName, 'Permitted merge')
  assert.equal(current.entitlementTier, 'free')
  assert.equal(current.accountStatus, 'active')
})

test('canonical root deletion tombstone fences profile create and update and remains unreadable', async () => {
  const owner = env.authenticatedContext(ownerId).firestore()
  const barrier = doc(owner, 'privacyDeletionTombstones', ownerId)
  const adminBarrier = doc(env.unauthenticatedContext().firestore(), 'privacyDeletionTombstones', ownerId)
  const seedFence = async (active) => env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'privacyDeletionTombstones', ownerId), { uid: ownerId, active })
  })
  const dropFence = async () => env.withSecurityRulesDisabled(async (context) =>
    deleteDoc(doc(context.firestore(), 'privacyDeletionTombstones', ownerId)))
  try {
    await clear()
    await seedFence(true)
    await assertFails(setDoc(profile(owner), { displayName: 'Blocked create' }))
    await seed({ displayName: 'Server established' })
    await assertFails(updateDoc(profile(owner), { displayName: 'Blocked update' }))
    await assertFails(getDoc(barrier))
    await assertFails(getDoc(adminBarrier))
    await assertFails(setDoc(barrier, { uid: ownerId, active: false }))
    await seedFence(false)
    await assertSucceeds(updateDoc(profile(owner), { displayName: 'Allowed after cleared fence' }))
    await dropFence()
    await assertSucceeds(updateDoc(profile(owner), { displayName: 'Allowed with missing fence' }))
  } finally {
    await dropFence()
    await clear()
  }
})
