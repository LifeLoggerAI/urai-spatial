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

test('trusted queues and durable receipts are globally closed to clients', () => {
  for (const collectionName of trustedCollections) {
    assert.match(rules, new RegExp(`match \\/${collectionName}\\/\\{docId\\} \\{ allow read, write: if false; \\}`))
  }
})

test('privacy rules end in a default-deny boundary', () => {
  assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/)
  assert.doesNotMatch(rules, /allow\s+(read|write|create|update|delete)[^;]*:\s*if\s+true\s*;/i)
})
