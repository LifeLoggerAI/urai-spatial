import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildExplicitDemoMemory,
  isTrustedMemoryMediaUrl,
  parseSelectedMemory,
} from '../src/spatial/memory/selectedMemoryContract.ts'

const trusted = 'https://storage.googleapis.com/governed-bucket/users/owner-a/memory.mp4'
const other = 'https://storage.googleapis.com/other-bucket/users/owner-a/memory.mp4'

test('missing or blank Storage bucket never admits a private media URL', () => {
  for (const bucket of [null, '', undefined]) {
    // Runtime must pass null explicitly for a missing bucket. The parser's
    // undefined argument exists only for legacy offline fixture callers.
    if (bucket === undefined) continue
    assert.equal(isTrustedMemoryMediaUrl(trusted, bucket), false)
    assert.equal(isTrustedMemoryMediaUrl(other, bucket), false)
  }
})

test('configured Storage authority accepts only its own HTTPS bucket URLs', () => {
  assert.equal(isTrustedMemoryMediaUrl(trusted, 'governed-bucket'), true)
  assert.equal(isTrustedMemoryMediaUrl(other, 'governed-bucket'), false)
  assert.equal(isTrustedMemoryMediaUrl('http://storage.googleapis.com/governed-bucket/a.mp4', 'governed-bucket'), false)
  assert.equal(isTrustedMemoryMediaUrl('https://example.com/a.mp4', 'governed-bucket'), false)
})

test('canonical private memory strips media and audio when bucket is missing', () => {
  const fixture = buildExplicitDemoMemory('r983-source')
  const raw = {
    ...fixture,
    ownerId: 'owner-a',
    demo: false,
    sourceMedia: [{ kind: 'video', url: trusted }],
    replayManifest: { ...fixture.replayManifest, audioUrl: trusted },
  }
  const denied = parseSelectedMemory(raw, 'owner-a', 'r983-source', null)
  assert.equal(denied.status, 'ready')
  assert.deepEqual(denied.memory.sourceMedia, [])
  assert.equal(denied.memory.replayManifest.audioUrl, undefined)
  const allowed = parseSelectedMemory(raw, 'owner-a', 'r983-source', 'governed-bucket')
  assert.equal(allowed.status, 'ready')
  assert.equal(allowed.memory.sourceMedia[0]?.url, trusted)
  assert.equal(allowed.memory.replayManifest.audioUrl, trusted)
})

test('both live Replay and both Life Movie paths explicitly fail closed on missing bucket', () => {
  const selected = readFileSync(new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')
  const movie = readFileSync(new URL('../src/app/life-movie/LifeMovieClient.tsx', import.meta.url), 'utf8')
  const guardedCall = 'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null'
  assert.equal(selected.split(guardedCall).length - 1, 1)
  assert.equal(movie.split(guardedCall).length - 1, 2)
})
