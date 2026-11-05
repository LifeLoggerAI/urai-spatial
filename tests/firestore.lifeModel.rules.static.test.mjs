import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const rules = fs.readFileSync('firebase/firestore.rules', 'utf8')
const lifeModelCollections = [
  'lifeEntities',
  'lifeEntityStates',
  'lifeClaims',
  'lifeRelationships',
  'lifeEvents',
  'lifeCorrections',
  'lifeConflicts',
  'knowledgeGaps',
  'personModelBundles',
  'sceneTruthPackets',
  'renderManifests',
  'simulationSessions',
  'lifeModelReceipts',
]

test('all Life Model collections are owner-readable and server-write-only', () => {
  for (const collectionName of lifeModelCollections) {
    const block = new RegExp(`match \\/${collectionName}\\/\\{[^}]+\\} \\{([\\s\\S]*?)\\n\\s*\\}`)
    const match = rules.match(block)
    assert.ok(match, `missing ${collectionName} rules block`)
    assert.match(match[1], /allow read: if isSelf\(uid\);/)
    assert.match(match[1], /allow write: if false;/)
    assert.doesNotMatch(match[1], /isAdmin\(\)/)
  }
})

test('Life Model records remain under users/{uid} and the global rules end default-deny', () => {
  assert.match(rules, /match \/users\/\{uid\} \{/)
  assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/)
})
