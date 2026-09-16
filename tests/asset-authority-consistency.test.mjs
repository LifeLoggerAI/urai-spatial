import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  authoritySupersessionErrors,
  canonicalRuntimeStatusErrors,
  currentProductionEvidenceErrors,
  productionEvidenceErrors,
  recordCurrentAuthorityEvidence,
  routeConsumptionErrors,
  sensoryRuntimeStatusErrors,
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

test('in-record historical flags cannot bypass current authority checks', () => {
  const payload = Buffer.from('candidate-bytes')
  const errors = productionEvidenceErrors({
    asset,
    payload,
    evidencePath: 'receipt.json',
    evidence: { currentAuthority: false, evidenceStatus: 'historical-superseded' },
  })
  assert.equal(errors.length, 3)
  assert.match(errors[0], /current production evidence exists/)
  assert.match(errors[1], /byte count drift/)
  assert.match(errors[2], /SHA-256 drift/)
})

test('non-authoritative evidence cannot satisfy production-ready current authority', () => {
  const productionAsset = {
    id: 'production-asset-v1',
    fixedPath: 'public/production-asset-v1.glb',
    releaseState: 'production-ready',
  }
  const currentDecisions = new Set()
  const currentReceipts = new Set()

  assert.equal(recordCurrentAuthorityEvidence({
    evidence: { currentAuthority: false },
    assetId: productionAsset.id,
    relativeDirectory: 'operations/assets/promotion-decisions',
    currentDecisions,
    currentReceipts,
  }), false)
  assert.equal(recordCurrentAuthorityEvidence({
    evidence: { currentAuthority: false },
    assetId: productionAsset.id,
    relativeDirectory: 'operations/assets/production-receipts',
    currentDecisions,
    currentReceipts,
  }), false)

  const errors = currentProductionEvidenceErrors({
    canonicalAssets: [productionAsset],
    currentDecisions,
    currentReceipts,
  })
  assert.equal(errors.length, 2)
  assert.match(errors[0], /no matching current promotion decision/)
  assert.match(errors[1], /no matching current production receipt/)
})

test('explicitly authoritative evidence satisfies production-ready current authority', () => {
  const productionAsset = {
    id: 'production-asset-v1',
    fixedPath: 'public/production-asset-v1.glb',
    releaseState: 'production-ready',
  }
  const currentDecisions = new Set()
  const currentReceipts = new Set()

  assert.equal(recordCurrentAuthorityEvidence({
    evidence: { currentAuthority: true },
    assetId: productionAsset.id,
    relativeDirectory: 'operations/assets/promotion-decisions',
    currentDecisions,
    currentReceipts,
  }), true)
  assert.equal(recordCurrentAuthorityEvidence({
    evidence: { currentAuthority: true },
    assetId: productionAsset.id,
    relativeDirectory: 'operations/assets/production-receipts',
    currentDecisions,
    currentReceipts,
  }), true)

  assert.deepEqual(currentProductionEvidenceErrors({
    canonicalAssets: [productionAsset],
    currentDecisions,
    currentReceipts,
  }), [])
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


test('pending sensory assets cannot retain runtime-ready authority', () => {
  const sensoryAsset = { id: 'global-cinematic-material-pack-v1', releaseState: 'pending-final-review' }
  const errors = sensoryRuntimeStatusErrors({
    canonicalAssets: [sensoryAsset],
    sensoryManifestSource: `materials: { id: 'global-cinematic-material-pack-v1', status: 'ready' }`,
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /pending sensory asset is runtime-ready/)
})

test('route-consumption accepts the governed runtime resolver id in the active owner', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-asset-resolver-'))
  try {
    const owner = 'HomeWorldProductionSacred.tsx'
    fs.writeFileSync(path.join(root, owner), "resolvePromotedUraiSpatialAssetPath('home-entry-chamber-model-v1')\n")
    const errors = routeConsumptionErrors({
      asset: { id: 'home-entry-chamber-v1', fixedPath: 'public/home-entry-chamber-v1.glb', targetRoutes: ['/home'] },
      evidence: { routeConsumptionVerified: true },
      root,
      runtimeManifestSource: "finalGlb('home-entry-chamber-model-v1', 'Home', 'home-entry-chamber-v1.glb')",
      routeOwners: { '/home': owner },
    })
    assert.deepEqual(errors, [])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})


test('pending human constructors participate in runtime authority checks', () => {
  const humanAsset = {
    id: 'home-human-makehuman-v4',
    fixedPath: 'public/human-makehuman-v4/home-human-makehuman-v4.glb',
    releaseState: 'pending-final-review',
  }
  const runtimeManifestSource = `
    const finalGlb = () => ({ status: 'candidate' })
    const pendingHuman = () => ({ status: 'ready' })
    export const uraiSpatialAssetManifest = [
      pendingHuman('home-human-makehuman-v4', 'Home Human', 'home-human-makehuman-v4.glb', 'home')
    ]
  `
  const errors = canonicalRuntimeStatusErrors({
    canonicalAssets: [humanAsset],
    runtimeManifestSource,
    promotionStateSource: 'export const uraiPromotedAssetIds = new Set<string>([])',
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /canonical pending asset is runtime-ready/)
})

test('an unmatched production audio pack cannot become runtime-ready', () => {
  const audioAsset = { id: 'urai-ambient-bed-v1', releaseState: 'pending-final-review' }
  const errors = sensoryRuntimeStatusErrors({
    canonicalAssets: [audioAsset],
    sensoryManifestSource: `ambientAudio: { id: 'production-spatial-audio-v1', status: 'ready' }`,
  })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /production-spatial-audio-v1: ready sensory asset has no canonical launch asset mapping/)
})

test('supersession records are repository-bound, path-safe, and tamper-evident', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-authority-supersession-'))
  try {
    const recordPath = 'evidence/historical-receipt.json'
    const absolute = path.join(root, recordPath)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, '{"historical":true}\n')
    const document = {
      schemaVersion: 'urai-asset-authority-supersession-1',
      repository: 'LifeLoggerAI/urai-spatial',
      predecessorCommit: 'a'.repeat(40),
      effectiveAt: '2026-09-03T00:00:00Z',
      status: 'historical-superseded',
      currentAuthority: false,
      reason: 'Current canonical bytes require fresh evidence.',
      records: [{
        path: recordPath,
        sha256: crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex'),
      }],
    }

    const valid = authoritySupersessionErrors({
      root,
      documents: [{ relativePath: 'operations/assets/authority-supersessions/test.json', document }],
      predecessorReader: () => Buffer.from('{"historical":true}\n'),
    })
    assert.deepEqual(valid.errors, [])
    assert.equal(valid.supersededPaths.has(recordPath), true)

    const rewrittenPredecessor = authoritySupersessionErrors({
      root,
      documents: [{ relativePath: 'operations/assets/authority-supersessions/test.json', document }],
      predecessorReader: () => Buffer.from('{"historical":"rewritten"}\n'),
    })
    assert.match(rewrittenPredecessor.errors[0], /predecessor Git blob drift/)

    fs.writeFileSync(absolute, '{"historical":false}\n')
    const tampered = authoritySupersessionErrors({
      root,
      documents: [{ relativePath: 'operations/assets/authority-supersessions/test.json', document }],
      predecessorReader: () => Buffer.from('{"historical":true}\n'),
    })
    assert.match(tampered.errors[0], /immutable record hash drift/)

    const unsafe = authoritySupersessionErrors({
      root,
      documents: [{
        relativePath: 'operations/assets/authority-supersessions/unsafe.json',
        document: { ...document, records: [{ path: '../outside.json', sha256: '0'.repeat(64) }] },
      }],
      predecessorReader: () => Buffer.from('{"historical":true}\n'),
    })
    assert.match(unsafe.errors[0], /safe repository-relative path/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
