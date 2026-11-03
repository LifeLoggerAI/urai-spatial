import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const rules = fs.readFileSync('firebase/firestore.rules', 'utf8')

const ownerReadOnlyCollections = [
  'privacyPolicy',
  'privacyRuntime',
  'privacyAudit',
  'privacyReceipts',
  'exportJobs',
  'deletionJobs',
  'dataSources',
  'devices',
  'providerConnections',
]

const strictlyOwnerReadOnlyCollections = [
  'capturedRealityAssets',
  'memories',
  'lifeMovies',
]

const trustedCollections = [
  'privacyEnforcementJobs',
  'providerRevocationQueue',
  'deletionQueue',
  'deletionReceipts',
]

test('owner privacy records are readable only inside users/{uid} and remain server-write-only', () => {
  for (const collectionName of ownerReadOnlyCollections) {
    const block = new RegExp(`match \\/${collectionName}\\/\\{[^}]+\\} \\{([\\s\\S]*?)\\n\\s*\\}`)
    const match = rules.match(block)
    assert.ok(match, `missing ${collectionName} rules block`)
    assert.match(match[1], /allow read: if isSelf\(uid\) \|\| isAdmin\(\);/)
    assert.match(match[1], /allow write: if false;/)
  }
})

test('full private memory and media records are owner-only and server-write-only', () => {
  for (const collectionName of strictlyOwnerReadOnlyCollections) {
    const block = new RegExp(`match \\/${collectionName}\\/\\{[^}]+\\} \\{([\\s\\S]*?)\\n\\s*\\}`)
    const match = rules.match(block)
    assert.ok(match, `missing ${collectionName} rules block`)
    assert.match(match[1], /allow read: if isSelf\(uid\);/)
    assert.match(match[1], /allow write: if false;/)
    assert.doesNotMatch(match[1], /allow read: if isSelf\(uid\) \|\| isAdmin\(\);/)
  }
})

test('trusted queues and durable receipts are globally closed to clients', () => {
  for (const collectionName of trustedCollections) {
    assert.match(rules, new RegExp(`match \\/${collectionName}\\/\\{docId\\} \\{ allow read, write: if false; \\}`))
  }
})

test('privacy rules end in a default-deny boundary', () => {
  assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/)
  const publicFeatureFlags = /match \/features\/\{flagId\} \{[\s\S]*?\n    \}/
  assert.match(rules, /match \/features\/\{flagId\} \{\s*allow read: if true;\s*allow write: if isAdmin\(\);\s*\}/)
  assert.doesNotMatch(rules.replace(publicFeatureFlags, ''), /allow\s+(read|write|create|update|delete)[^;]*:\s*if\s+true\s*;/i)
})

// User-profile authority mutation boundary.
const userRuleBlock = rules.match(/match \/users\/\{uid\} \{([\s\S]*?)\n\s*match \/privacyPolicy\/\{docId\}/)?.[1]

const protectedFields = ["role","admin","isAdmin","legalHold","markedForDeletion","deletionMarkedAt","entitlementTier","founderOverride","deleted","accountStatus"]

test('user profile create must reject every privileged and server-owned lifecycle field', () => {
  assert.ok(userRuleBlock, 'must locate canonical users/{uid} rule')
  const create = userRuleBlock.match(/allow create: if ([\s\S]*?);/)?.[1]
  assert.ok(create)
  assert.match(create, /request\.resource\.data\.keys\(\)\.hasAny\(/)
  for (const field of protectedFields) assert.match(create, new RegExp(`'${field}'`))
})

test('user profile update must reject added, removed and modified authority fields', () => {
  assert.ok(userRuleBlock)
  const update = userRuleBlock.match(/allow update: if ([\s\S]*?);/)?.[1]
  assert.ok(update)
  assert.match(update, /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasAny\(/)
  assert.doesNotMatch(update, /\.changedKeys\(\)/)
  for (const field of protectedFields) assert.match(update, new RegExp(`'${field}'`))
})

test('profile ownership, private-payload protection and default-deny remain in place', () => {
  assert.ok(userRuleBlock)
  assert.match(userRuleBlock, /allow create: if isSelf\(uid\)/)
  assert.match(userRuleBlock, /allow update: if isSelf\(uid\)/)
  assert.equal((userRuleBlock.match(/&& isPrivateSpatialPayloadSafe\(\)/g) ?? []).length, 2)
  assert.match(userRuleBlock, /allow delete: if false;/)
})

test('owner profiles require explicitly inactive Privacy tombstones with no outstanding deletion leases', () => {
  assert.ok(userRuleBlock, 'canonical users/{uid} rule must exist')
  const create = userRuleBlock.match(/allow create: if ([\s\S]*?);/)?.[1]
  const update = userRuleBlock.match(/allow update: if ([\s\S]*?);/)?.[1]
  assert.ok(create)
  assert.ok(update)
  assert.match(create, /&& deletionFenceIsInactive\(uid\)/)
  assert.match(update, /&& deletionFenceIsInactive\(uid\)/)
  assert.match(userRuleBlock, /allow delete: if false;/)

  const fence = rules.match(/function deletionFenceIsInactive\(uid\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? ''
  assert.ok(fence.includes('let tombstone = /databases/$(database)/documents/privacyDeletionTombstones/$(uid);'))
  assert.ok(fence.includes('!exists(tombstone)'))
  assert.ok(fence.includes("get(tombstone).data.get('active', null) == false"))
  assert.ok(fence.includes('!get(tombstone).data.keys().hasAny(['))
  assert.ok(!fence.includes('.data.active != true'), 'nonboolean tombstones must deny')
  for (const key of ['deletionPlanningLeaseToken','deletionPlanningLeaseUntil',
      'deletionPlanningLeaseRequestId','deletionPlanningLeaseOperation','deletionPlanningLeaseBy']) {
    assert.ok(fence.includes("'" + key + "'"), 'missing deletion-planning lease: ' + key)
  }
})

test('profile create and update preserve embedded user identity on both old and new fields', () => {
  assert.ok(userRuleBlock, 'canonical users/{uid} match required')
  const create = userRuleBlock.match(/allow create: if ([\s\S]*?);/)?.[1] ?? ''
  const update = userRuleBlock.match(/allow update: if ([\s\S]*?);/)?.[1] ?? ''
  assert.match(create, /isUserOwnedCreate\(uid\)/)
  assert.match(update, /isUserOwnedUpdate\(uid\)/)
  for (const name of ['uid', 'userId', 'ownerId']) {
    assert.ok(rules.includes('request.resource.data.' + name + ' == uid'),
      name + ' must be owner-bound after write')
    assert.ok(rules.includes('resource.data.' + name + ' == uid'),
      name + ' must be owner-bound before update')
  }
})

test('canonical C1 consent can be read before the first grant without opening cross-owner reads', () => {
  const c1 = rules.match(/match \/consentRecords\/\{consentId\} \{([\s\S]*?)\n\s*\}/)?.[1] ?? ''
  assert.ok(c1, 'canonical C1 read rule required')
  assert.match(c1, /consentId == request.auth.uid \+ '_memory_storage'/)
  assert.match(c1, /!exists\(\/databases\/\$\(database\)\/documents\/consentRecords\/\$\(consentId\)\)/)
  for (const field of ['uid', 'purpose', 'consentTier', 'policyVersion']) {
    assert.match(c1, new RegExp('resource\\.data\\.' + field + '\\s*=='),
      field + ' must be checked on an existing record')
  }
  assert.match(c1, /allow list, write: if false;/)
})
