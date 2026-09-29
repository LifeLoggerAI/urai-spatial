import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const lifeMovie = fs.readFileSync('src/app/life-movie/LifeMovieClient.tsx', 'utf8')
const rules = fs.readFileSync('../firebase/firestore.rules', 'utf8')
const privacy = fs.readFileSync('../apps/functions/src/privacyOperations.ts', 'utf8')
const inventory = fs.readFileSync('../privacy/data-inventory.md', 'utf8')

test('Life Movie reads the canonical owner-scoped private memories collection', () => {
  assert.match(lifeMovie, /collection\(getFirebaseDb\(\), 'users', user\.uid, 'memories'\)/)
  assert.match(lifeMovie, /parseSelectedMemory\(item\.data\(\), user\.uid, item\.id, process\.env\.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\)/)
  assert.match(lifeMovie, /result\.memory && result\.status === 'ready'/)
})

test('canonical private memories are owner-readable and server-write-only', () => {
  const block = rules.match(/match \/memories\/\{memoryId\} \{([\s\S]*?)\n\s*\}/)
  assert.ok(block, 'missing users/{uid}/memories Firestore rules block')
  assert.match(block[1], /allow read: if isSelf\(uid\);/)
  assert.doesNotMatch(block[1], /isAdmin\(\)/)
  assert.match(block[1], /allow write: if false;/)
})

test('canonical memories are portable and included in deletion scopes', () => {
  assert.match(privacy, /data\.memories = await collectionDocuments\(userRef\.collection\('memories'\)\)/)
  assert.match(privacy, /memories: \['memories', 'replayEvents', 'spatialMemories', 'canonChains'\]/)
  const allData = privacy.match(/'all-repository-data': \[([\s\S]*?)\n\s*\],/)
  assert.ok(allData, 'missing all-repository-data deletion scope')
  assert.match(allData[1], /'memories'/)
})

test('Life Movie media is restricted to the configured Firebase Storage authority', () => {
  const contract = fs.readFileSync('src/spatial/memory/selectedMemoryContract.ts', 'utf8')
  const selected = fs.readFileSync('src/spatial/memory/useSelectedMemory.ts', 'utf8')
  assert.match(contract, /function trustedMemoryMediaUrl/)
  assert.match(contract, /parsed\.protocol !== 'https:'/)
  assert.match(contract, /firebasestorage\.googleapis\.com/)
  assert.match(contract, /storage\.googleapis\.com/)
  assert.match(contract, /trustedStorageBucket/)
  assert.match(selected, /NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET/)
})

test('privacy inventory declares memory text and media as exportable and deletable', () => {
  assert.match(inventory, /\| Memory text \| `memories` \|[^\n]*\| Yes \| Yes \|/)
  assert.match(inventory, /\| Memory media \| `memories\/storage` \|[^\n]*\| Yes \| Yes \|/)
})
