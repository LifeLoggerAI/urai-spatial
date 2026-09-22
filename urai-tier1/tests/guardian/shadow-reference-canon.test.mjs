import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../../src/spatial/realms/SpatialRealmExperience.tsx', import.meta.url), 'utf8')
const capture = fs.readFileSync(new URL('../../../scripts/capture-reference-estate.mjs', import.meta.url), 'utf8')

test('Shadow uses grounded mineral authority rather than fantasy portal/crystal language', () => {
  const shadow = source.slice(source.indexOf('type ShadowReviewState'), source.indexOf('function CouncilPresence'))
  assert.match(shadow, /grounded-threshold-marker/)
  assert.match(shadow, /shadow-stable-return-landmark/)
  assert.match(shadow, /roughness=\{0\.9/)
  assert.doesNotMatch(shadow, /octahedronGeometry/)
  assert.doesNotMatch(shadow, /torusGeometry/)
  assert.doesNotMatch(shadow, /Sparkles/)
  assert.doesNotMatch(shadow, /Stars/)
})

test('Shadow reference estate covers all nine written states', () => {
  for (let index = 1; index <= 9; index += 1) {
    const id = `SHADOW-${String(index).padStart(3, '0')}`
    assert.ok(capture.includes(`id:'${id}'`), `missing ${id}`)
  }
  for (const state of ['entry','neutral','uncertainty','pattern','safe-reduction','recovery','reduced-stimulation']) {
    assert.ok(source.includes(`'${state}'`), `missing review state ${state}`)
  }
})
