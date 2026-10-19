import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (relative) => fs.readFileSync(new URL(relative, import.meta.url), 'utf8')
const renderer = read('../src/spatial/layout/HomeWorldProductionPolished.tsx')
const materials = read('../src/spatial/layout/HomeSanctuaryMaterials.tsx')
const manifest = JSON.parse(read('../../operations/assets/launch-critical-assets.json'))
const promotion = JSON.parse(read('../../operations/assets/promotion-decisions/home-entry-chamber-v1.json'))

test('three original Home paths consume one world-meter earth/stone material grammar', () => {
  assert.match(materials, /type SurfaceKind = 'ground' \| 'stone' \| 'timber' \| 'path'/)
  assert.match(materials, /WALKABLE_PATH_STRATA/)
  assert.match(materials, /kind === 'path' \? WALKABLE_PATH_STRATA/)
  assert.match(materials, /path: compileOriginalDetail\('path'\)/)
  assert.match(materials, /urai-original-home-path-earth-and-stone-v1/)
  const start = renderer.indexOf('function SanctuaryPath()')
  const end = renderer.indexOf('function FernBatch(', start)
  assert.ok(start !== -1 && end > start)
  const paths = renderer.slice(start, end)
  for (const key of ['MAIN_PATH_GEOMETRY', 'GROUND_PATH_GEOMETRY', 'LIFE_MAP_PATH_GEOMETRY']) {
    assert.match(paths, new RegExp(key))
  }
  assert.equal((paths.match(/kind="path"/g) ?? []).length, 3)
  assert.equal((paths.match(/<HomeCC0ReviewMaterial surface="path" \\/>/g) ?? []).length, 3)
  // Photographic maps must remain higher priority in explicitly opted-in local dev.
  assert.equal((paths.match(/HOME_CC0_DEV_REVIEW \? <HomeCC0ReviewMaterial surface="path" \\/> : <HomeSurfaceMaterial kind="path"/g) ?? []).length, 3)
  assert.match(paths, /home-sanctuary-path/)
  assert.doesNotMatch(paths, /new THREE\.Geometry|<planeGeometry/)
})

test('source-only color improvement cannot promote or mislabel final Home art', () => {
  const homeAsset = manifest.assets.find((asset) => asset.id === 'home-entry-chamber-v1')
  assert.ok(homeAsset)
  assert.equal(homeAsset.releaseState, 'pending-final-review')
  assert.equal(promotion.promote, false)
  assert.equal(promotion.humanReviewApproved, false)
  assert.equal(promotion.visualProofVerified, false)
  assert.match(materials, /Authored non-photographic fallback/)
  assert.match(renderer, /HOME_CC0_DEV_REVIEW = process\.env\.NODE_ENV === 'development'/)
  assert.match(renderer, /<HomeSkyGradient \/>/)
  assert.match(renderer, /<HomeSanctuaryPerimeterGrove \/>/)
  assert.match(renderer, /<HomeInterpretiveSplatEnvironment/)
})
