import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/orbActivitySnapshotAuthority.ts', import.meta.url), 'utf8')
const built = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(built.diagnostics ?? [], [], 'source transpilation must succeed')
const { canonicalOrbActivitySnapshot, sealOrbAuthorizedActivity, matchesOrbAuthorizedActivity } =
  await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(built.outputText))
const alpha = 'a'.repeat(64), bravo = 'b'.repeat(64)
const entries = [{ category: 'unverified-owner-report', description: 'This happened, I think.', sourceKey: alpha }]
const initial = { privacyRevision: 12, entries }

test('model receives only bounded visible data, never source ID or privacy revision', () => {
  const sealed = sealOrbAuthorizedActivity(initial)
  assert.deepEqual(JSON.parse(sealed.modelContext), [{ category: 'unverified-owner-report', description: 'This happened, I think.' }])
  assert.equal(sealed.modelContext.includes(alpha), false)
  assert.equal(sealed.modelContext.includes('privacyRevision'), false)
  assert.match(sealed.authorityTag, /^[a-f0-9]{64}$/)
})
test('same authorized source and revision are accepted', () => {
  assert.equal(matchesOrbAuthorizedActivity(sealOrbAuthorizedActivity(initial), structuredClone(initial)), true)
})
test('delete-recreate with identical text but different document ID is rejected', () => {
  assert.equal(matchesOrbAuthorizedActivity(sealOrbAuthorizedActivity(initial),
    { privacyRevision: 12, entries: [{ ...entries[0], sourceKey: bravo }] }), false)
})
test('privacy revision change invalidates even empty history', () => {
  assert.equal(matchesOrbAuthorizedActivity(sealOrbAuthorizedActivity({ privacyRevision: 12, entries: [] }),
    { privacyRevision: 13, entries: [] }), false)
})
test('changed text, deleted records, and relabeled categories invalidate', () => {
  const sealed = sealOrbAuthorizedActivity(initial)
  assert.equal(matchesOrbAuthorizedActivity(sealed, { privacyRevision: 12, entries: [{ ...entries[0], description: 'Different claim' }] }), false)
  assert.equal(matchesOrbAuthorizedActivity(sealed, { privacyRevision: 12, entries: [] }), false)
  assert.equal(matchesOrbAuthorizedActivity(sealed, { privacyRevision: 12, entries: [{ ...entries[0], category: 'hypothetical-scenario' }] }), false)
})
test('malformed source, unauthorized extra fields, or too many records fail closed', () => {
  assert.throws(() => sealOrbAuthorizedActivity({ privacyRevision: 12, entries: [{ ...entries[0], sourceKey: 'users/secret' }] }), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
  assert.throws(() => sealOrbAuthorizedActivity({ privacyRevision: 12, entries: [{ ...entries[0], privateUid: 'secret' }] }), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
  assert.throws(() => sealOrbAuthorizedActivity({ privacyRevision: 12, entries: [entries[0], entries[0], entries[0], entries[0]] }), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
})
test('visible-only view cannot directly accept metadata', () => {
  assert.deepEqual(JSON.parse(canonicalOrbActivitySnapshot([{ category: 'hypothetical-scenario', description: 'What if?' }])),
    [{ category: 'hypothetical-scenario', description: 'What if?' }])
  assert.throws(() => canonicalOrbActivitySnapshot(entries), /ORB_ACTIVITY_SNAPSHOT_INVALID/)
})
