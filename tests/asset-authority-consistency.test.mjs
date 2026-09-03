import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  canonicalRuntimeStatusErrors,
  productionEvidenceErrors,
  routeConsumptionErrors,
} from '../scripts/verify-asset-authority-consistency.mjs'

const asset = {
  id: 'passport-status-room-v1',
  fixedPath: 'public/passport-status-room-v1.glb',
  releaseState: 'pending-final-review',
  targetRoutes: ['/passport'],
}

test('pending canonical assets cannot be runtime-ready or promoted', () => {
  const runtimeManifestSource = `
    const finalGlb = () => ({ status: 'ready' })
    export const uraiSpatialAssetManifest = [
      finalGlb('passport-status-room-glb-v1', 'Passport', 'passport-status-room-v1.glb')
    ]
  `
  const promotionStateSource = `export const uraiPromotedAssetIds = new Set<string>(['passport-status-room-glb-v1'])`
  const errors = canonicalRuntimeStatusErrors({ canonicalAssets: [asset], runtimeManifestSource, promotionStateSource })
  assert.equal(errors.length, 2)
  assert.match(errors[0], /canonical pending asset is runtime-ready/)
  assert.match(errors[1], /hard-coded promoted/)
})

test('superseded production evidence is explicit and cannot act as current authority', () => {
  const payload = Buffer.from('candidate-bytes')
  assert.deepEqual(productionEvidenceErrors({
    asset,
    payload,
    evidencePath: 'receipt.json',
    evidence: { currentAuthority: false, evidenceStatus: 'historical-superseded' },
  }), [])
  assert.match(productionEvidenceErrors({
    asset,
    payload,
    evidencePath: 'receipt.json',
    evidence: { releaseState: 'production-ready', bytes: 1, sha256: 'stale' },
  })[0], /current production evidence exists/)
})

test('route-consumption claims require the active route owner to reference the asset', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-asset-authority-'))
  try {
    const owner = 'PassportVaultClient.tsx'
    fs.writeFileSync(path.join(root, owner), 'export default function Passport() { return null }\n')
    const errors = routeConsumptionErrors({
      asset,
      evidence: { routeConsumptionVerified: true },
      root,
      routeOwners: { '/passport': owner },
    })
    assert.equal(errors.length, 1)
    assert.match(errors[0], /does not consume passport-status-room-v1\.glb/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
