import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/orbActivitySnapshotAuthority.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(output.diagnostics ?? [], [], 'the isolated module must transpile without errors')
const {
  canonicalOrbActivitySnapshot, matchesOrbActivitySnapshot, ORB_ACTIVITY_CONTEXT_LIMIT,
} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(output.outputText))
const entries = [
  { category: 'hypothetical-scenario', description: 'What if I wait?' },
  { category: 'unverified-owner-report', description: 'I believe something happened; it is not verified.' },
]
test('distinct provenance labels and bounded export', () => {
  assert.deepEqual(JSON.parse(canonicalOrbActivitySnapshot(entries)), entries)
  assert.equal(ORB_ACTIVITY_CONTEXT_LIMIT, 3)
})
test('an unchanged current snapshot matches', () => {
  const original = canonicalOrbActivitySnapshot(entries)
  assert.equal(matchesOrbActivitySnapshot(original, structuredClone(entries)), true)
})
test('correction, deletion, addition, and reordered results fail closed', () => {
  const original = canonicalOrbActivitySnapshot(entries)
  assert.equal(matchesOrbActivitySnapshot(original, entries.slice(0, 1)), false)
  assert.equal(matchesOrbActivitySnapshot(original, [{ ...entries[0], description: 'What if I leave?' }, entries[1]]), false)
  assert.equal(matchesOrbActivitySnapshot(original, [...entries, { ...entries[0] }]), false)
  assert.equal(matchesOrbActivitySnapshot(original, [...entries].reverse()), false)
})
test('rejects extra sensitive fields, fabricated authority, and more than three records', () => {
  assert.throws(() => canonicalOrbActivitySnapshot([{ ...entries[0], ownerId: 'secret' }]), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
  assert.throws(() => canonicalOrbActivitySnapshot([{ category: 'verified-fact', description: 'An event' }]), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
  assert.throws(() => canonicalOrbActivitySnapshot([entries[0], entries[0], entries[0], entries[0]]), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
})
test('blank, null, and oversized record descriptions are rejected', () => {
  assert.throws(() => canonicalOrbActivitySnapshot([{ category: 'unverified-owner-report', description: '' }]), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
  assert.throws(() => canonicalOrbActivitySnapshot([null]), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
  assert.throws(() => canonicalOrbActivitySnapshot([{ category: 'unverified-owner-report', description: 'x'.repeat(281) }]), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
})
test('whitespace normalization gives a stable comparison without adding claims', () => {
  const first = [{ category: 'unverified-owner-report', description: '  Not verified  ' }]
  const encoded = canonicalOrbActivitySnapshot(first)
  assert.equal(JSON.parse(encoded)[0].description, 'Not verified')
  assert.equal(matchesOrbActivitySnapshot(encoded, [{ category: 'unverified-owner-report', description: 'Not verified' }]), true)
})
