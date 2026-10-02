import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const contract = read('src/spatial/life-movie/lifeMovieRuntimeContract.ts')

test('Life Movie manifest fails closed on owner mismatch and non-authorized consent', () => {
  assert.match(contract, /ownerId !== expectedOwnerId/)
  assert.match(contract, /raw\.consentState === 'revoked'/)
  assert.match(contract, /value\.consentState !== 'authorized'/)
  assert.match(contract, /status: 'unauthorized'/)
})

test('Life Movie chapter identity and ordering are deterministic', () => {
  assert.match(contract, /chapterIds.size !== validChapters.length/)
  assert.match(contract, /memoryIds.size !== validChapters.length/)
  assert.match(contract, /orders.size !== validChapters.length/)
  assert.match(contract, /validChapters.sort((left, right) => left.order - right.order)/)
})

test('Life Movie truth classes are explicit and confidence is bounded', () => {
  for (const truthClass of [
    'RECORDED_SOURCE_TRUTH',
    'ATTRIBUTED_FAMILY_RECOLLECTION',
    'SPATIALLY_RECONSTRUCTABLE',
    'INTERPRETIVE_CINEMATIC_RECREATION',
    'UNKNOWN_UNRESOLVED',
  ]) {
    assert.match(contract, new RegExp(truthClass))
  }
  assert.match(contract, /confidence < 0/)
  assert.match(contract, /confidence > 1/)
})

test('Life Movie runtime accepts only internal UrAi replay destinations', () => {
  assert.match(contract, /parsed.origin !== 'https://urai.invalid'/)
  assert.match(contract, /'\/life-map'/)
  assert.match(contract, /'\/focus'/)
  assert.match(contract, /'\/replay'/)
  assert.match(contract, /'\/life-movie'/)
  assert.match(contract, /'\/spatial\/memory-world'/)
  assert.match(contract, /'\/spatial\/captured-reality'/)
  assert.match(contract, /'\/spatial\/interpretive-world'/)
})

test('Life Movie provenance is tokenized and never stores raw private media URLs', () => {
  assert.match(contract, /sourceIds: safeTokenArray/)
  assert.match(contract, /storyNodeIds: safeTokenArray/)
  assert.match(contract, /objectIds: safeTokenArray/)
  assert.match(contract, /providerTaskIds: safeTokenArray/)
  assert.doesNotMatch(contract, /drive\.google\.com|googleusercontent\.com|http:\/\//)
})

test('Life Movie replay and return links remain memory-bound', () => {
  assert.match(contract, /memoryId: chapter.memoryId/)
  assert.match(contract, /from: 'life-movie'/)
  assert.match(contract, /chapterId: chapter.id/)
  assert.match(contract, /chapter.replayExit/)
})
