import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const hook = read('src/spatial/life-movie/useLifeMovieRuntimeManifest.ts')
const client = read('src/app/life-movie/LifeMovieClient.tsx')
const contract = read('src/spatial/life-movie/lifeMovieRuntimeContract.ts')

test('Life Movie loads manifests only from the signed-in owner private path', () => {
  assert.match(hook, /onAuthStateChanged/)
  assert.match(hook, /'users', user\.uid, 'lifeMovies', movieId/)
  assert.match(hook, /parseLifeMovieRuntimeManifest\(snapshot\.data\(\), user\.uid\)/)
  assert.match(hook, /Sign in to open this private Life Movie/)
})

test('Life Movie manifest playback resolves chapters to exact owner memories', () => {
  assert.match(client, /requestedMovieId = sanitizeMemoryId\(params\.get\('movieId'\)\)/)
  assert.match(client, /useLifeMovieRuntimeManifest\(requestedMovieId\)/)
  assert.match(client, /runtimeManifest\.manifest\.chapters\.map/)
  assert.match(client, /'users', user\.uid, 'memories', chapter\.memoryId/)
  assert.match(client, /parseSelectedMemory\(snapshot\.data\(\), user\.uid, chapter\.memoryId/)
})

test('Life Movie preserves governed chapter order and does not re-sort manifest playback chronologically', () => {
  const manifestBranch = client.match(/if \(requestedMovieId\) \{[\s\S]*?\} else \{/)?.[0]
  assert.ok(manifestBranch)
  assert.doesNotMatch(manifestBranch, /safeOccurredAt/)
  assert.match(client, /runtimeManifest\.manifest\.chapters\[activeIndex\]/)
})

test('Life Movie Replay handoff uses chapter-bound runtime contract when available', () => {
  assert.match(client, /lifeMovieReplayHref\(activeChapter\)/)
  assert.match(contract, /memoryId: chapter\.memoryId/)
  assert.match(contract, /chapterId: chapter\.id/)
  assert.match(contract, /from: 'life-movie'/)
})

test('Life Movie exposes truth class and confidence without exposing private source pointers', () => {
  assert.match(client, /data-truth-class=\{activeChapter\?\.truthClass\}/)
  assert.match(client, /Math\.round\(activeChapter\.confidence \* 100\)/)
  assert.match(client, /preserve chapter order, truth class, confidence, consent, and provenance/)
  assert.doesNotMatch(client, /drive\.google\.com|docs\.google\.com|gmailMessageId|driveFileId/)
})

test('Life Movie keeps existing owner-memory fallback when no manifest is requested', () => {
  assert.match(client, /getDocs\(query\(collection\(getFirebaseDb\(\), 'users', user\.uid, 'memories'\), limit\(36\)\)\)/)
  assert.match(client, /parsed\.sort\(\(left, right\) => safeOccurredAt\(right\) - safeOccurredAt\(left\)\)/)
  assert.match(client, /requestedMemoryId/)
})

test('Life Movie Firestore authority is owner-readable and server-write-only', () => {
  const rules = read('../firebase/firestore.rules')
  assert.match(rules, /match \/lifeMovies\/\{movieId\} \{[\s\S]*?allow read: if isSelf\(uid\);[\s\S]*?allow write: if false;/)
})
