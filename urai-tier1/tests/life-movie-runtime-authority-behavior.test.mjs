import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// This runs the actual original TypeScript parser, not a regex copy of its policy.
// Only the canonical sanitizer import is stubbed, with its exact token contract.
const source = readFileSync(new URL('../src/spatial/life-movie/lifeMovieRuntimeContract.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, strict: true },
}).outputText
const module = { exports: {} }
vm.runInNewContext(compiled, {
  module,
  exports: module.exports,
  URL,
  URLSearchParams,
  encodeURIComponent,
  require(specifier) {
    assert.equal(specifier, '@/spatial/memory/selectedMemoryContract')
    return { sanitizeMemoryId(value) {
      return value && /^[A-Za-z0-9._:-]{1,120}$/.test(value) ? value : null
    } }
  },
}, { filename: 'lifeMovieRuntimeContract.ts' })
const { parseLifeMovieRuntimeManifest, lifeMovieReplayHref, lifeMovieReturnHref } = module.exports
const owner = 'synthetic-owner'
const chapter = (overrides = {}) => ({
  id: 'chapter-a', memoryId: 'memory-a', order: 0,
  truthClass: 'RECORDED_SOURCE_TRUTH', confidence: 0.94,
  consentState: 'authorized', languageTracks: [],
  provenance: { sourceIds: ['synthetic-src'], storyNodeIds: [], objectIds: [], providerTaskIds: [] },
  ...overrides,
})
const manifest = (overrides = {}) => ({
  id: 'movie-a', ownerId: owner, version: 1, consentState: 'authorized',
  status: 'ready', chapters: [chapter()], ...overrides,
})

test('draft Life Movie remains draft and is not advertised as ready for playback', () => {
  const result = parseLifeMovieRuntimeManifest(manifest({ status: 'draft' }), owner)
  assert.equal(result.status, 'draft')
  assert.equal(result.manifest?.status, 'draft')
  assert.doesNotMatch(result.message, /manifest ready\./i)
})

test('ready owner-authorized Life Movie retains ready status and chapter identity', () => {
  const result = parseLifeMovieRuntimeManifest(manifest(), owner)
  assert.equal(result.status, 'ready')
  assert.equal(result.manifest?.chapters[0].memoryId, 'memory-a')
})

test('empty or overlong Life Movie cannot be reported ready', () => {
  for (const chapters of [[], Array.from({ length: 65 }, (_, i) => chapter({ id: 'chapter-' + i, memoryId: 'memory-' + i, order: i }))]) {
    const result = parseLifeMovieRuntimeManifest(manifest({ chapters }), owner)
    assert.equal(result.status, 'corrupt')
    assert.equal(result.manifest, null)
  }
})

test('Life Movie denies foreign owner and revoked consent', () => {
  assert.equal(parseLifeMovieRuntimeManifest(manifest(), 'other-owner').status, 'unauthorized')
  assert.equal(parseLifeMovieRuntimeManifest(manifest({ consentState: 'revoked' }), owner).status, 'unauthorized')
})

test('Replay entry and return never change chapter-selected memory', () => {
  const good = parseLifeMovieRuntimeManifest(manifest({ chapters: [chapter({
    replayEntry: '/replay?memoryId=memory-a&from=life-movie',
    replayExit: '/life-movie?memoryId=memory-a',
  })] }), owner)
  assert.equal(good.status, 'ready')
  assert.equal(new URL(lifeMovieReplayHref(good.manifest.chapters[0]), 'https://urai.invalid').searchParams.get('memoryId'), 'memory-a')
  assert.equal(new URL(lifeMovieReturnHref(good.manifest.chapters[0]), 'https://urai.invalid').searchParams.get('memoryId'), 'memory-a')
  for (const rawEntry of [
    '/replay?memoryId=another-memory',
    '/replay?memoryId=memory-a&memoryId=another-memory',
    '/replay?chapterId=other-chapter',
  ]) {
    const result = parseLifeMovieRuntimeManifest(manifest({ chapters: [chapter({ replayEntry: rawEntry })] }), owner)
    assert.equal(result.status, 'corrupt')
  }
})

test('unbound internal replay links receive the selected chapter identity', () => {
  const result = parseLifeMovieRuntimeManifest(manifest({ chapters: [chapter({
    replayEntry: '/replay?from=life-movie', replayExit: '/life-map',
  })] }), owner)
  assert.equal(result.status, 'ready')
  const entry = new URL(lifeMovieReplayHref(result.manifest.chapters[0]), 'https://urai.invalid')
  assert.equal(entry.searchParams.get('memoryId'), 'memory-a')
  assert.equal(entry.searchParams.get('chapterId'), 'chapter-a')
  const exit = new URL(lifeMovieReturnHref(result.manifest.chapters[0]), 'https://urai.invalid')
  assert.equal(exit.searchParams.get('memoryId'), 'memory-a')
})
