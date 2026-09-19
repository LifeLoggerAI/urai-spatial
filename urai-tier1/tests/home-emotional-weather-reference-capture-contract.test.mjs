import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const hook = fs.readFileSync(new URL('../src/app/home/useHomePersonalizedScene.ts', import.meta.url), 'utf8')
const model = fs.readFileSync(new URL('../src/app/home/homePersonalizationModel.ts', import.meta.url), 'utf8')
const sky = fs.readFileSync(new URL('../src/spatial/assets/HomeAtmosphericSky.tsx', import.meta.url), 'utf8')
const capture = fs.readFileSync(new URL('../../scripts/capture-reference-estate.mjs', import.meta.url), 'utf8')

test('weather review tone override is isolated to explicit asset-review private fixture', () => {
  assert.match(hook, /homeAssetReview/)
  assert.match(hook, /homePrivateFixture/)
  assert.match(hook, /homeWeatherReview/)
  assert.match(hook, /reviewWeatherTone/)
  assert.match(model, /reviewWeatherTone \?\? deriveWeatherTone\(evidence\)/)
})

test('review time override is explicit and cannot replace normal adaptive time outside review', () => {
  assert.match(sky, /homeTimeReview/)
  assert.match(sky, /homeAssetReview/)
  assert.match(sky, /resolveReviewBlueHour\(\) \?\? resolveAdaptiveBlueHour\(\)/)
})

test('reference estate captures supported Personal Emotional Weather authority states', () => {
  for (const id of ['WEATHER-001','WEATHER-002','WEATHER-003','WEATHER-004','WEATHER-005','WEATHER-006','WEATHER-007','WEATHER-008','WEATHER-009','WEATHER-010','WEATHER-011','WEATHER-013','WEATHER-014','WEATHER-015','WEATHER-018']) {
    assert.ok(capture.includes(`id:'${id}'`), `missing ${id}`)
  }
  assert.ok(!capture.includes("id:'WEATHER-012'"), 'reduced-stimulation capture must remain blocked until a real control exists')
  assert.ok(!capture.includes("id:'WEATHER-016'"), 'private place-specific overlay must not be fabricated')
  assert.ok(!capture.includes("id:'WEATHER-017'"), 'disclosed place-specific demo must not be fabricated')
})
