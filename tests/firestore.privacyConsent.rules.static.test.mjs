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
  'speechPurposeLeases',
  'capturedRealityAssets',
  'memories',
  'lifeMovies',
]

const trustedCollections = [
  'privacyEnforcementJobs',
  'providerRevocationQueue',
  'speechProviderPurgeQueue',
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

const protectedFields = ['entitlementTier', 'isAdmin', 'founderOverride', 'deleted', 'accountStatus']

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
