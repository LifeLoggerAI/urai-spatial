import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import path from 'node:path'

const read = (name) => fs.readFileSync(new URL(name, import.meta.url), 'utf8')
const manifest = JSON.parse(read('../../operations/assets/candidates/home-polyhaven-cc0-dev-review-1.json'))
const home = read('../src/spatial/layout/HomeWorldProductionPolished.tsx')
const material = read('../src/spatial/layout/HomeCC0ReviewMaterial.tsx')
const shrubs = read('../src/spatial/layout/HomeCC0ReviewShrubs.tsx')
const stage = read('../../scripts/home-cc0-source-review.mjs')
const next = read('../next.config.mjs')
const geometry = read('../src/spatial/layout/HomeSanctuaryGeometry.ts')

test('only official pinned CC0 originals may stage and no accepted status is claimed', () => {
  assert.equal(manifest.classification, 'NONPRODUCTION_CANDIDATE_UNAPPROVED')
  assert.equal(manifest.releaseApproved, false)
  assert.equal(manifest.reviewApproved, false)
  assert.equal(manifest.license, 'CC0-1.0')
  assert.equal(manifest.files.length, 11)
  assert.equal(new Set(manifest.files.map(x => x.path)).size, 11)
  for (const entry of manifest.files) {
    assert.match(entry.md5, /^[a-f0-9]{32}$/)
    assert.match(entry.url, /^https:\/\/dl\.polyhaven\.org\/file\/ph-assets\//)
    assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes > 0)
    assert.equal(path.posix.normalize(entry.path), entry.path)
  }
  assert.match(stage, /createHash\('md5'\)/)
  assert.match(stage, /verifySource\(\)/)
  assert.match(stage, /rejectRelease\(\)/)
  assert.match(next, /CC0_REVIEW_PUBLIC/)
  assert.match(next, /unapproved CC0 review textures\/models/)
})

test('original Home consumes photographic textures only during explicit local opt-in', () => {
  assert.match(home, /HOME_CC0_DEV_REVIEW = process\.env\.NODE_ENV === 'development'/)
  assert.match(home, /NEXT_PUBLIC_URAI_HOME_CC0_DEV_REVIEW/)
  assert.match(home, /<HomeCC0ReviewMaterial surface="ground" \/>/)
  assert.equal((home.match(/<HomeCC0ReviewMaterial surface="path" \/>/g) || []).length, 3)
  assert.match(home, /<HomeCC0ReviewShrubs \/>/)
  assert.match(home, /<HomeSanctuaryPerimeterGrove \/>/)
  assert.match(material, /diffuse\.colorSpace = THREE\.SRGBColorSpace/)
  assert.match(material, /normal\.colorSpace = roughness\.colorSpace = THREE\.NoColorSpace/)
  assert.match(material, /normalMap=\{maps\.normal\}/)
  assert.match(material, /roughnessMap=\{maps\.roughness\}/)
  assert.match(material, /texture\.repeat\.set\(\.5, \.5\)/)
  assert.match(geometry, /uvs\.push\(edgeX, edgeZ\)/)
  assert.match(shrubs, /useGLTF\(model\)/)
  assert.match(shrubs, /NONPRODUCTION_CANDIDATE_UNAPPROVED/)
})

test('existing release-gated Home cannot be falsely promoted by preview admission', () => {
  const original=JSON.parse(read('../../operations/assets/launch-critical-assets.json'))
  const homeAsset=original.assets.find(x => x.id === 'home-entry-chamber-v1')
  const decision=JSON.parse(read('../../operations/assets/promotion-decisions/home-entry-chamber-v1.json'))
  assert.equal(homeAsset.releaseState, 'pending-final-review')
  assert.equal(decision.promote, false)
  assert.equal(decision.humanReviewApproved, false)
  assert.equal(decision.visualProofVerified, false)
  assert.match(home, /HOME_INTERPRETIVE_SPLAT_ASSET/)
})
