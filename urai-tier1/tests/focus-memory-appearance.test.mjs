import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/app/focus/focusMemoryAppearance.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const module = { exports: {} }
new Function('module', 'exports', compiled)(module, module.exports)
const { focusMemoryAppearance } = module.exports
const fallback = '/assets/urai/replay/replay-memory-film-main.webp'
const memory = (starId, demo = true) => ({ id: `demo:${starId}`, star: { id: starId }, demo, sourceMedia: [], visuals: { accent: '#123456', light: '#abcdef' } })

test('Calm Return, Dream Signal and Recovery Arc use distinct existing disclosed illustrations', () => {
  const appearances = ['seed-calm-return', 'seed-dream-signal', 'seed-recovery-arc'].map(id => focusMemoryAppearance(memory(id), fallback))
  assert.equal(new Set(appearances.map(item => item.imageUrl)).size, 3)
  assert.equal(new Set(appearances.map(item => item.accent)).size, 3)
  for (const appearance of appearances) assert.ok(existsSync(new URL(`../public${appearance.imageUrl}`, import.meta.url)))
})

test('every named sample resolves to its bundled illustration without modifying the memory', () => {
  for (const id of ['seed-memory-bloom', 'seed-recovery-arc', 'seed-threshold-storm', 'seed-mirror-focus', 'seed-ritual-echo', 'seed-dream-signal', 'seed-calm-return']) {
    const selected = memory(id)
    const before = JSON.stringify(selected)
    assert.match(focusMemoryAppearance(selected, fallback).imageUrl, /^\/demo\/memories\/[a-z-]+\.svg$/)
    assert.equal(JSON.stringify(selected), before)
  }
})

test('an ordinary memory with a sample-like identifier keeps its own appearance and no substitute image', () => {
  const appearance = focusMemoryAppearance(memory('seed-dream-signal', false), fallback)
  assert.deepEqual(appearance, { accent: '#123456', light: '#abcdef', imageUrl: null })
})

test('disclosed demo images remain visible without inventing private media authority', () => {
  const selected = memory('seed-calm-return', true)
  selected.sourceMedia = [{ kind: 'audio', url: '/synthetic.wav' }, { kind: 'image', url: '/synthetic-demo-image.webp' }]
  assert.equal(focusMemoryAppearance(selected, fallback).imageUrl, '/synthetic-demo-image.webp')
})

test('private photosphere denies legacy source URLs and requires receipt-backed image Blob', () => {
  const selected = { ...memory('seed-calm-return', false), ownerId: 'owner-a', authorization: 'owner', privacy: 'private',
    sourceMedia: [{ kind: 'image', url: 'https://firebasestorage.googleapis.com/v0/b/example.appspot.com/o/private?alt=media&token=old' }] }
  const permitted = { kind: 'image', url: 'blob:https://urai.app/receipt-backed-image' }
  assert.equal(focusMemoryAppearance(selected, fallback).imageUrl, null)
  assert.equal(focusMemoryAppearance(selected, fallback, selected.sourceMedia).imageUrl, null)
  assert.equal(focusMemoryAppearance(selected, fallback, [permitted]).imageUrl, permitted.url)
  assert.equal(focusMemoryAppearance({ ...selected, privacy: 'hidden' }, fallback, [permitted]).imageUrl, null)
  assert.equal(focusMemoryAppearance({ ...selected, privacy: 'shareable' }, fallback, [permitted]).imageUrl, null)
  assert.equal(focusMemoryAppearance({ ...selected, authorization: 'none' }, fallback, [permitted]).imageUrl, null)
  assert.equal(focusMemoryAppearance({ ...selected, sourceMedia: [permitted] }, fallback).imageUrl, null)
})

test('unknown disclosed samples retain the generic disclosed fallback', () => {
  const appearance = focusMemoryAppearance(memory('unknown-sample'), fallback)
  assert.equal(appearance.imageUrl, fallback)
  assert.equal(appearance.accent, '#123456')
})

test('a missing selected memory never gains illustrative content', () => {
  assert.equal(focusMemoryAppearance(null, fallback).imageUrl, null)
})
