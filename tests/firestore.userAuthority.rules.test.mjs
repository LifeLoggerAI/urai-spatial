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

test('malformed tombstones and unreconciled planning leases block profile creation and updates', async () => {
  const owner = env.authenticatedContext(ownerId).firestore()
  const target = profile(owner)
  const barrier = doc(owner, 'privacyDeletionTombstones', ownerId)
  const setFence = (entry) => env.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), 'privacyDeletionTombstones', ownerId), { uid: ownerId, ...entry }))
  const removeFence = () => env.withSecurityRulesDisabled((context) =>
    deleteDoc(doc(context.firestore(), 'privacyDeletionTombstones', ownerId)))
  const invalid = [
    {}, { active: null }, { active: 'false' }, { active: 0 }, { active: true },
    { active: false, deletionPlanningLeaseToken: 'unresolved-lease' },
    { active: false, deletionPlanningLeaseUntil: '2026-11-03T05:00:00.000Z' },
    { active: false, deletionPlanningLeaseRequestId: 'request-pending' },
    { active: false, deletionPlanningLeaseOperation: 'pending' },
    { active: false, deletionPlanningLeaseBy: 'reviewer' },
  ]
  try {
    for (const [index, tombstone] of invalid.entries()) {
      await clear()
      await setFence(tombstone)
      await assertFails(setDoc(target, { displayName: 'Blocked create ' + index }))
      await seed({ displayName: 'Server-established' })
      await assertFails(updateDoc(target, { displayName: 'Blocked update ' + index }))
      await assertFails(getDoc(barrier))
    }
    await setFence({ active: false })
    await assertSucceeds(updateDoc(target, { displayName: 'Allowed only when explicitly inactive' }))
    await removeFence()
    await assertSucceeds(updateDoc(target, { displayName: 'Allowed with no tombstone' }))
  } finally {
    await removeFence()
    await clear()
  }
})

test('profile create and update reject forged embedded owner identities', async () => {
  const own = env.authenticatedContext(ownerId).firestore()
  const target = profile(own)
  await clear()
  try {
    for (const key of ['uid', 'userId', 'ownerId']) {
      await assertFails(setDoc(target, { displayName: 'Forged create', [key]: otherOwnerId }))
    }
    await assertSucceeds(setDoc(target, { displayName: 'Valid create', uid: ownerId,
      userId: ownerId, ownerId }))
    for (const key of ['uid', 'userId', 'ownerId']) {
      await assertFails(updateDoc(target, { [key]: otherOwnerId }))
      await assertFails(setDoc(target, { displayName: 'Forged replacement',
        uid: ownerId, userId: ownerId, ownerId, [key]: otherOwnerId }))
    }
    await assertSucceeds(updateDoc(target, { displayName: 'Valid update' }))
    await seed({ displayName: 'Historical corrupted profile', uid: otherOwnerId })
    await assertFails(updateDoc(target, { displayName: 'Cannot modify foreign-bound record' }))
  } finally {
    await clear()
  }
})

test('first-time missing C1 consent read succeeds without permitting foreign or forged consent records', async () => {
  const uid = 'fictional-consent-read-' + Date.now()
  const own = env.authenticatedContext(uid).firestore()
  const other = env.authenticatedContext(otherOwnerId).firestore()
  const path = ['consentRecords', uid + '_memory_storage']
  const record = doc(own, ...path)
  const seedConsent = value => env.withSecurityRulesDisabled(context =>
    setDoc(doc(context.firestore(), ...path), value))
  const clearConsent = () => env.withSecurityRulesDisabled(context =>
    deleteDoc(doc(context.firestore(), ...path)))
  try {
    await clearConsent()
    const missing = await assertSucceeds(getDoc(record))
    assert.equal(missing.exists(), false)
    await assertFails(getDoc(doc(other, ...path)))
    await assertFails(setDoc(record, { uid, status: 'granted' }))
    await seedConsent({ uid, purpose: 'memory.storage', consentTier: 'C1',
      policyVersion: '1.0.0', status: 'granted' })
    assert.equal((await assertSucceeds(getDoc(record))).exists(), true)
    for (const data of [
      { uid: otherOwnerId, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0' },
      { uid, purpose: 'data.export', consentTier: 'C1', policyVersion: '1.0.0' },
      { uid, purpose: 'memory.storage', consentTier: 'C7', policyVersion: '1.0.0' },
      { uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '0.0.0' },
    ]) {
      await seedConsent(data)
      await assertFails(getDoc(record))
    }
  } finally {
    await clearConsent()
  }
})
