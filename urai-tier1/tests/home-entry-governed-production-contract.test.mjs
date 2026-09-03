import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'

const binaryPath = 'public/assets/urai/generated/models/home-entry-chamber-v1.glb'
const binary = fs.readFileSync(binaryPath)
const launchManifest = JSON.parse(fs.readFileSync('../operations/assets/launch-critical-assets.json', 'utf8'))
const productionReceipt = JSON.parse(fs.readFileSync('../operations/assets/production-receipts/home-entry-chamber-v1.json', 'utf8'))
const promotionDecision = JSON.parse(fs.readFileSync('../operations/assets/promotion-decisions/home-entry-chamber-v1.json', 'utf8'))
const promotionState = fs.readFileSync('src/spatial/assets/assetPromotionState.ts', 'utf8')
const resolver = fs.readFileSync('src/spatial/assets/promotedAssetResolver.ts', 'utf8')
const layer = fs.readFileSync('src/spatial/scene/SpatialWorldAssetLayer.tsx', 'utf8')

const home = launchManifest.assets.find((asset) => asset.id === 'home-entry-chamber-v1')

test('binds canonical pending authority to the current Home GLB', () => {
  assert.equal(binary.length, 1786808)
  assert.equal(crypto.createHash('sha256').update(binary).digest('hex'), '73f2a49ed2cfd6cd7ae9baed7b3908d53e0cac75b9f36ff1b8be9654e3d3e2f2')
  assert.equal(home.releaseState, 'pending-final-review')
  assert.equal(home.requiredCompression, 'draco-or-meshopt')
  assert.equal(home.source, productionReceipt.source)
  assert.equal(home.license, productionReceipt.license)
  assert.equal(home.fallback, promotionDecision.fallback)
  assert.equal(productionReceipt.authorityBoundary.currentBinarySha256, crypto.createHash('sha256').update(binary).digest('hex'))
})

test('preserves historical acceptance evidence without granting it current authority', () => {
  assert.equal(productionReceipt.visualAcceptance.accepted, true)
  assert.equal(productionReceipt.visualAcceptance.continuousSpatialVisualProofRunId, 30432962277)
  assert.equal(productionReceipt.visualAcceptance.independentProofPullRequest, 968)
  assert.equal(productionReceipt.compressionStatus, 'meshopt')
  assert.equal(productionReceipt.currentAuthority, false)
  assert.equal(productionReceipt.evidenceStatus, 'historical-superseded')
  assert.equal(productionReceipt.authorityBoundary.canonicalState, 'pending-final-review')
  assert.equal(productionReceipt.providerCallsForPromotion, 0)
  assert.equal(productionReceipt.providerSpendForPromotionUsd, '0.00')
})

test('preserves the superseded promotion decision as non-authoritative history', () => {
  assert.equal(promotionDecision.mode, 'promotion')
  assert.equal(promotionDecision.promote, true)
  assert.equal(promotionDecision.currentAuthority, false)
  assert.equal(promotionDecision.evidenceStatus, 'historical-superseded')
  assert.equal(promotionDecision.authorityBoundary.canonicalState, 'pending-final-review')
  assert.equal(promotionDecision.authorityBoundary.currentBinarySha256, crypto.createHash('sha256').update(binary).digest('hex'))
  assert.notEqual(promotionDecision.producer, promotionDecision.reviewer)
  assert.equal(promotionDecision.receiptPath, 'operations/assets/production-receipts/home-entry-chamber-v1.json')
})

test('current runtime falls back until a fresh governed promotion exists', () => {
  assert.match(promotionState, /new Set<string>\(\)/)
  assert.match(promotionState, /Readonly<Record<string, string>> = \{\}/)
  assert.doesNotMatch(promotionState, /home-entry-chamber-v1\.gltf/)
  assert.match(resolver, /!selectedAsset \|\| !isUraiAssetPromoted\(assetId\)/)
  assert.match(resolver, /uraiPromotedAssetPathOverrides\[assetId\] \?\? selectedAsset\.path/)
  assert.match(layer, /assetId="home-entry-chamber-model-v1"/)
})
