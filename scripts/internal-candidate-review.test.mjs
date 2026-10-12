import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const manifest = JSON.parse(readFileSync('operations/assets/launch-critical-assets.json', 'utf8'))
const pack = JSON.parse(readFileSync('operations/assets/generated-receipts/urai-final-glb-pack-v1.json', 'utf8'))
const page = readFileSync('urai-tier1/src/app/internal/asset-candidates/page.tsx', 'utf8')
const viewer = readFileSync('urai-tier1/src/app/internal/asset-candidates/CandidateReview.tsx', 'utf8')
const capture = readFileSync('scripts/capture-candidate-review.mjs', 'utf8')

test('source GLB review cannot be opened in production or without both explicit preview gates', () => {
  assert.match(page, /process\.env\.NODE_ENV !== 'development'/)
  assert.match(page, /process\.env\.URAI_INTERNAL_CANDIDATE_REVIEW !== 'true'/)
  assert.match(page, /process\.env\.NEXT_PUBLIC_URAI_PREVIEW_MODE !== 'true'/)
  assert.match(page, /notFound\(\)/)
  assert.match(page, /candidateAssetsMayShip !== false/)
  assert.match(viewer, /finalArtAdmitted: false/)
  assert.doesNotMatch(viewer, /requestCouncilProvider|sessionStorage|localStorage|memoryId/)
})
test('eight immutable committed GLBs are present and have exact SHA-256 receipts without promotion', () => {
  assert.equal(manifest.releasePolicy.candidateAssetsMayShip, false)
  assert.equal(pack.assets.length, 8)
  for (const receipt of pack.assets) {
    const asset = manifest.assets.find(row => row.fixedPath?.endsWith('/' + receipt.fileName))
    assert.ok(asset, receipt.fileName)
    assert.equal(asset.releaseState, 'pending-final-review')
    assert.ok(asset.license && asset.source && asset.fallback)
    const bytes = readFileSync(asset.fixedPath)
    assert.equal(bytes.readUInt32LE(0), 0x46546c67)
    assert.equal(bytes.length, receipt.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256)
  }
})
test('browser review verifies actual model network bytes and source material identities', () => {
  assert.match(capture, /response\.body\(\)/)
  assert.match(capture, /expectedSha256/)
  assert.match(capture, /page\.screenshot/)
  assert.match(viewer, /useGLTF\(asset\.url\)/)
  assert.match(viewer, /materials\.add\(mat\)/)
  assert.match(viewer, /textureCount: textures\.size/)
})

test('review waits for hydration and preserves mobile asset visibility without lowering model integrity', () => {
  assert.match(viewer, /data-asset-review-interactive/)
  assert.match(viewer, /setHydrated\(true\)/)
  assert.match(viewer, /flexWrap: 'nowrap'/)
  assert.match(viewer, /overflowX: 'auto'/)
  assert.match(capture, /data-asset-review-interactive="true"/)
  assert.match(capture, /fullPage: item\.profile === 'desktop'/)
  assert.match(capture, /responsePromises/)
})

test('hydration and selected-identity waits target the inspected root, not its descendants', () => {
  assert.match(capture, /page\.locator\('\[data-testid="urai-internal-candidate-review"\]\[data-asset-review-interactive="true"\]'\)/)
  assert.match(capture, /page\.locator\('\[data-testid="urai-internal-candidate-review"\]\[data-asset-review-id=/)
  assert.doesNotMatch(capture, /main\.locator\('\[data-asset-review-id=/)
})

test('initial review scene uses independently checked model before exercising Home GLB transitions', () => {
  assert.match(viewer, /assets\.find\(x => x\.id === 'portal-ring-master-v1'\)/)
  assert.match(capture, /if \(item\.entry\.id === 'home-entry-chamber-v1'\)/)
  assert.match(capture, /expectedSha256/)
  assert.match(capture, /r\.hash === item\.receipt\.sha256/)
})
