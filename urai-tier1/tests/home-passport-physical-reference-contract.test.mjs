import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
const capture = fs.readFileSync(new URL('../../scripts/capture-reference-estate.mjs', import.meta.url), 'utf8')

test('physical Home Passport is the written rigid-folio candidate, not the superseded custody stone', () => {
  assert.match(source, /visualForm: 'rigid-ownership-folio-v1'/)
  assert.match(source, /dimensionsMm: \[185, 260, 18\]/)
  assert.match(source, /boxGeometry args=\{\[0\.0925, 0\.26, 0\.018\]\}/)
  assert.doesNotMatch(source, /protected-custody-stone-v2/)
  assert.doesNotMatch(source, /icosahedronGeometry/)
  assert.doesNotMatch(source, /octahedronGeometry/)
})

test('physical Passport preserves semantic ownership, exact-origin capture and authored interaction states', () => {
  assert.match(source, /HOME_PASSPORT_ORIGIN_CAPTURE_EVENT/)
  assert.match(source, /cameraCheckpoint: 'home-first-person-passport-origin'/)
  for (const state of ['dormant', 'focused', 'selected', 'opening']) assert.ok(source.includes(`'${state}'`), `missing state ${state}`)
  assert.match(source, /Passport — open ownership and consent vault/)
  assert.match(source, /reducedMotion \? 140 : 700/)
})

test('reference estate captures the complete physical Passport pack without substituting the conventional vault', () => {
  for (let index = 1; index <= 15; index += 1) {
    const id = `PASSPORT-PHYS-${String(index).padStart(3, '0')}`
    assert.ok(capture.includes(`id:'${id}'`), `missing ${id}`)
  }
  assert.match(source, /homePassportReference/)
  assert.match(source, /neutral-model-sheet/)
  assert.match(source, /human-scale/)
  assert.match(source, /non-likeness-human-scale-reference/)
  assert.match(source, /homeReducedStimulation/)
  assert.match(capture, /passportReview=recent-auth-locked/)
  assert.match(capture, /passportReview=unavailable/)
})
