import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8')
const workflow = read('../../.github/workflows/home-scanned-composition-forge.yml')
const entry = read('../src/spatial/layout/HomeWorldProduction.tsx')
const renderer = read('../src/spatial/layout/HomeWorldProductionPolished.tsx')
const launch = JSON.parse(read('../../operations/assets/launch-critical-assets.json'))
const decision = JSON.parse(read('../../operations/assets/promotion-decisions/home-entry-chamber-v1.json'))

test('Home source proof follows the active original renderer, not retired source', () => {
  assert.match(entry, /HomeWorldProductionPolished as HomeWorldProduction/)
  assert.match(workflow, /urai-tier1\/src\/spatial\/layout\/HomeWorldProductionPolished\.tsx/)
  assert.doesNotMatch(workflow, /HomeWorldProductionFinal\.tsx/)
  assert.match(workflow, /repair\/release-closure-integration-20261007/)
  assert.match(workflow, /home-active-art-ci-contract\.test\.mjs/)
  assert.match(workflow, /HomeSanctuaryMaterials\.tsx/)
  assert.match(workflow, /HomeSanctuaryPerimeterGrove\.tsx/)
  assert.match(workflow, /homePerimeterGrovePlacement\.ts/)
  assert.match(workflow, /URAI_EXACT_HEAD/)
  assert.match(renderer, /HOME_SCANNED_COMPOSITION_V1/)
  assert.match(renderer, /HomeSanctuaryPerimeterGrove/)
  assert.match(renderer, /HOME_INTERPRETIVE_SPLAT_ASSET/)
  assert.doesNotMatch(renderer, /CinematicBackdrop/)
})

test('existing source and receipt do not constitute accepted photographic Home', () => {
  const home = launch.assets.find((asset) => asset.id === 'home-entry-chamber-v1')
  assert.ok(home)
  assert.equal(home.releaseState, 'pending-final-review')
  assert.equal(decision.promote, false)
  assert.equal(decision.visualProofVerified, false)
  assert.equal(decision.humanReviewApproved, false)
  assert.match(renderer, /legacy-placeholder-metadata-only/)
  assert.match(renderer, /NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET/)
  assert.match(renderer, /NODE_ENV !== 'production'/)
  assert.match(renderer, /world001ModeledV3/)
})
