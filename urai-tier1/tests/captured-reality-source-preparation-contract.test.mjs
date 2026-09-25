import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const script = fs.readFileSync(new URL('../../scripts/prepare-captured-reality-source.mjs', import.meta.url), 'utf8')
const standard = fs.readFileSync(new URL('../../docs/REAL_PLACE_CAPTURE_STANDARD.md', import.meta.url), 'utf8')
const profile = JSON.parse(fs.readFileSync(new URL('../../operations/captured-reality/capture-readiness-v1.json', import.meta.url), 'utf8'))

test('source preparation preserves immutable originals and hashes every derivative', () => {
  assert.match(script, /immutable source changed during derivative creation/)
  assert.match(script, /originalSha256/)
  assert.match(script, /sha256: sha256\(file\)/)
  assert.match(script, /ANALYSIS_DERIVATIVE_NOT_SOURCE_AUTHORITY/)
})

test('analysis derivatives fail closed above the private transfer ceiling', () => {
  assert.match(script, /240 \* 1024 \* 1024/)
  assert.match(script, /exceeds the 240 MiB analysis ceiling/)
  assert.match(script, /segment-seconds/)
})

test('capture standard separates geometry, audio, object and people evidence', () => {
  for (const heading of ['Geometry pass', 'Object-detail pass', 'Ambient-audio pass', 'People/story pass']) {
    assert.ok(standard.includes(heading))
  }
  assert.match(standard, /Generated fill is interpretive/)
})

test('machine-readable readiness contract forbids source mutation and generated archival truth', () => {
  assert.equal(profile.sourceMutationAllowed, false)
  assert.equal(profile.generatedFillMayCountAsRecordedTruth, false)
  assert.ok(profile.states.includes('blocked-privacy'))
  assert.ok(profile.requiredChecks.includes('transition-coverage-reviewed'))
})
