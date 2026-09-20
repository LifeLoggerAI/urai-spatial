import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const earth = fs.readFileSync(new URL('../src/spatial/home/HomeGlobalEmotionalFieldEarth.tsx', import.meta.url), 'utf8')
const homeRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
const field = fs.readFileSync(new URL('../src/spatial/lived-world/globalEmotionalField.ts', import.meta.url), 'utf8')

test('Home mounts a separate first-person Global Emotional Field Earth candidate without private-map reuse', () => {
  assert.match(homeRepair, /HomeGlobalEmotionalFieldEarth/)
  assert.match(homeRepair, /useState<GlobalFieldState>\('unavailable'\)/)
  assert.match(homeRepair, /<HomeGlobalEmotionalFieldEarth state=\{globalFieldState\} \/>/)
  assert.match(earth, /name="home-global-emotional-field-earth"/)
  assert.match(earth, /visibility: 'first-person-only'/)
  assert.match(earth, /privateMapReuse: false/)
  assert.match(earth, /individualDots: false/)
  assert.match(earth, /exactLocationExposure: false/)
  assert.match(earth, /providerState: 'not-activated'/)
  assert.doesNotMatch(earth, /LocationMap|location-map|private.*terrain/i)
})

test('Earth candidate is truthful by default and cannot fabricate emotional activity', () => {
  assert.match(earth, /state = 'unavailable'/)
  assert.match(homeRepair, /setGlobalFieldState\(review === 'suppressed' \? 'suppressed' : 'unavailable'\)/)
  assert.doesNotMatch(homeRepair, /setGlobalFieldState\([^\n]*'aggregate'/)
  assert.match(earth, /aggregate signal is currently unavailable/)
  assert.match(earth, /No emotional activity is inferred or fabricated/)
  assert.match(earth, /state === 'aggregate'/)
  assert.match(earth, /state === 'suppressed'/)
  assert.match(field, /export type GlobalFieldState = 'unavailable' \| 'suppressed' \| 'aggregate'/)
})

test('public-good privacy evaluator retains fail-closed cohort and precision boundaries', () => {
  assert.match(field, /GLOBAL_EMOTIONAL_FIELD_DEFAULT_MINIMUM_COHORT = 100/)
  assert.match(field, /DEDICATED_PUBLIC_GOOD_CONSENT_NOT_GRANTED/)
  assert.match(field, /INSUFFICIENT_COHORT/)
  assert.match(field, /HIGHER_SENSITIVE_COHORT_THRESHOLD_REQUIRED/)
  assert.match(field, /PRECISION_TOO_FINE/)
  assert.match(field, /SAFE_AGGREGATE_AVAILABLE/)
})
