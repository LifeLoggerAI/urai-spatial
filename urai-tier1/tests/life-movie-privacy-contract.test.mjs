import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const lifeMovie = fs.readFileSync('src/app/life-movie/LifeMovieClient.tsx', 'utf8')
const rules = fs.readFileSync('../firebase/firestore.rules', 'utf8')
const privacy = fs.readFileSync('../apps/functions/src/privacyOperations.ts', 'utf8')
const inventory = fs.readFileSync('../privacy/data-inventory.md', 'utf8')
const manifest = fs.readFileSync('../privacy/feature-manifests/life-movie.privacy.yaml', 'utf8')

test('Life Movie reads the canonical owner-scoped private memories collection', () => {
  assert.match(lifeMovie, /collection\(getFirebaseDb\(\), 'users', user\.uid, 'memories'\)/)
  assert.match(lifeMovie, /parseSelectedMemory\(item\.data\(\), user\.uid, item\.id\)/)
  assert.match(lifeMovie, /result\.memory && result\.status === 'ready'/)
})

test('canonical private memories are owner-readable and server-write-only', () => {
  const block = rules.match(/match \/memories\/\{memoryId\} \{([\s\S]*?)\n\s*\}/)
  assert.ok(block, 'missing users/{uid}/memories Firestore rules block')
  assert.match(block[1], /allow read: if isSelf\(uid\) \|\| isAdmin\(\);/)
  assert.match(block[1], /allow write: if false;/)
})

test('canonical memories are portable and included in deletion scopes', () => {
  assert.match(privacy, /data\.memories = await collectionDocuments\(userRef\.collection\('memories'\)\)/)
  assert.match(privacy, /memories: \['memories', 'replayEvents', 'spatialMemories', 'canonChains'\]/)
  const allData = privacy.match(/'all-repository-data': \[([\s\S]*?)\n\s*\],/)
  assert.ok(allData, 'missing all-repository-data deletion scope')
  assert.match(allData[1], /'memories'/)
})

test('privacy inventory declares memory text and media as exportable and deletable', () => {
  assert.match(inventory, /\| Memory text \| `memories` \|[^\n]*\| Yes \| Yes \|/)
  assert.match(inventory, /\| Memory media \| `memories\/storage` \|[^\n]*\| Yes \| Yes \|/)
})


test('Life Movie privacy manifest maps the canonical memory authority without inventing a new data class', () => {
  assert.match(manifest, /feature: life-movie/)
  assert.match(manifest, /collectionOrTable: memories/)
  assert.match(manifest, /consentTier: C2/)
  assert.match(manifest, /exportable: true/)
  assert.match(manifest, /deletable: true/)
  assert.match(manifest, /newInferenceCreated: false/)
  assert.match(manifest, /clientWriteAllowed: false/)
  assert.match(manifest, /decision: blocked_until_reviewed/)
})
