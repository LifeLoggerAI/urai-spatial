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

test('reference estate captures only currently supported physical Passport pack states', () => {
  for (const id of ['PASSPORT-PHYS-003','PASSPORT-PHYS-004','PASSPORT-PHYS-005','PASSPORT-PHYS-006','PASSPORT-PHYS-007','PASSPORT-PHYS-008','PASSPORT-PHYS-009','PASSPORT-PHYS-010','PASSPORT-PHYS-011','PASSPORT-PHYS-012','PASSPORT-PHYS-013','PASSPORT-PHYS-014','PASSPORT-PHYS-015']) {
    assert.ok(capture.includes(`id:'${id}'`), `missing ${id}`)
  }
  for (const id of ['PASSPORT-PHYS-001','PASSPORT-PHYS-002']) {
    assert.ok(!capture.includes(`id:'${id}'`), `${id} must remain unclaimed until its real neutral model-sheet/reference state exists`)
  }
  assert.match(source, /homeReducedStimulation/)
  assert.match(capture, /passportReview=recent-auth-locked/)
  assert.match(capture, /passportReview=unavailable/)
})
