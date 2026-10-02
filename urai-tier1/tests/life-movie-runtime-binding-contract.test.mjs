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

test('Life Movie owner controls persist only chapter identity and order', () => {
  const operations = read('src/spatial/life-movie/lifeMovieManifestOperations.ts')
  assert.match(client, /saveLifeMovieManifest/)
  assert.match(client, /chapters: memories\.map/)
  assert.match(client, /memoryId: memory\.id/)
  assert.match(client, /order: index/)
  assert.match(client, /Save sequence/)
  assert.match(client, /Update sequence/)
  assert.match(client, /Remove saved sequence/)
  assert.match(operations, /movieId: string/)
  assert.match(operations, /memoryId: string/)
  assert.doesNotMatch(operations, /truthClass|confidence|sourceIds|providerTaskIds|cinematicAssetId|spatialAssetId/)
})

test('Life Movie save and revoke use canonical callable names', () => {
  const operations = read('src/spatial/life-movie/lifeMovieManifestOperations.ts')
  assert.match(operations, /'upsertLifeMovieManifest'/)
  assert.match(operations, /'revokeLifeMovieManifest'/)
  assert.match(client, /window\.location\.assign\(next\.pathname \+ next\.search\)/)
  assert.match(client, /window\.location\.assign\('\/life-movie'\)/)
})

test('Life Movie is a first-class persistent world destination', () => {
  const worldTypes = read('src/spatial/world/worldTypes.ts')
  const registry = read('src/spatial/world/destinationRegistry.ts')
  const provider = read('src/spatial/world/WorldStateProvider.tsx')
  const controller = read('src/spatial/world/WorldTransitionController.tsx')
  const events = read('src/spatial/world/worldEvents.ts')
  assert.match(worldTypes, /'life-movie'/)
  assert.match(worldTypes, /movieId\?: string/)
  assert.match(worldTypes, /chapterId\?: string/)
  assert.match(registry, /href: '\/life-movie'/)
  assert.match(registry, /environmentalForm: 'cinematic-memory-continuum'/)
  assert.match(provider, /params\.get\('movieId'\)/)
  assert.match(provider, /params\.get\('chapterId'\)/)
  assert.match(controller, /'movieId'/)
  assert.match(controller, /'chapterId'/)
  assert.match(events, /context\?\.movieId/)
  assert.match(events, /context\?\.chapterId/)
})

test('Life Movie and Replay cross the same persistent-world threshold in both directions', () => {
  const replay = read('src/app/replay/CinematicReplayClient.tsx')
  assert.match(client, /requestUraiWorldTravel\(\{/)
  assert.match(client, /destination: 'replay'/)
  assert.match(client, /entryPortal: 'life-movie-memory-threshold'/)
  assert.match(client, /movieId: requestedMovieId/)
  assert.match(client, /chapterId: activeChapter\?\.id/)
  assert.match(replay, /destination: 'life-movie'/)
  assert.match(replay, /entryPortal: 'replay-life-movie-threshold'/)
  assert.match(replay, /movieId: world\.movieId/)
  assert.match(replay, /chapterId: world\.chapterId/)
  assert.match(replay, /Continue Life Movie/)
})

test('Life Movie is exposed by canonical launch and live certification surfaces', () => {
  const launchPanel = read('src/app/LaunchRoutePanel.tsx')
  const launchTruth = read('src/data/launchTruth.ts')
  const strictLive = read('../scripts/final-live-text-gates.mjs')
  assert.match(launchPanel, /Life Movie/)
  assert.match(launchPanel, /open-life-movie/)
  assert.match(launchPanel, /\/life-movie\?memoryId=/)
  assert.match(launchTruth, /path: '\/life-movie'/)
  assert.match(launchTruth, /Private Life Movie continuum/)
  assert.match(launchTruth, /private source material remains owner-scoped/)
  assert.match(strictLive, /\['life-movie', '\/life-movie'/)
  assert.match(strictLive, /Sign in to open your private Life Movie/)
})
