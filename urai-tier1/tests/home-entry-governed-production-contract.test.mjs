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

test('binds production governance to the exact reviewed Home GLB', () => {
  assert.equal(binary.length, 184160)
  assert.equal(crypto.createHash('sha256').update(binary).digest('hex'), 'b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529')
  assert.equal(home.releaseState, 'production-ready')
  assert.equal(home.requiredCompression, 'draco-or-meshopt')
  assert.equal(home.source, productionReceipt.source)
  assert.equal(home.license, productionReceipt.license)
  assert.equal(home.fallback, promotionDecision.fallback)
})

test('retains independent visual acceptance and explicit steward deployment authority', () => {
  assert.equal(productionReceipt.visualAcceptance.accepted, true)
  assert.equal(productionReceipt.visualAcceptance.continuousSpatialVisualProofRunId, 30432962277)
  assert.equal(productionReceipt.visualAcceptance.independentProofPullRequest, 968)
  assert.equal(productionReceipt.compressionStatus, 'meshopt')
  assert.equal(productionReceipt.deploymentAuthorized, true)
  assert.equal(productionReceipt.paidExecutionAuthorized, true)
  assert.equal(productionReceipt.providerCallsForPromotion, 0)
  assert.equal(productionReceipt.providerSpendForPromotionUsd, '0.00')
})

test('records an independently reviewed governed promotion decision', () => {
  assert.equal(promotionDecision.mode, 'promotion')
  assert.equal(promotionDecision.promote, true)
  assert.equal(promotionDecision.humanReviewApproved, true)
  assert.equal(promotionDecision.visualProofVerified, true)
  assert.equal(promotionDecision.fallbackVerified, true)
  assert.equal(promotionDecision.routeConsumptionVerified, true)
  assert.equal(promotionDecision.optimizationVerified, true)
  assert.notEqual(promotionDecision.producer, promotionDecision.reviewer)
  assert.equal(promotionDecision.receiptPath, 'operations/assets/production-receipts/home-entry-chamber-v1.json')
})

test('current runtime consumes the canonical Home GLB without a stale override', () => {
  assert.match(promotionState, /'home-entry-chamber-model-v1'/)
  assert.doesNotMatch(promotionState, /home-entry-chamber-v1\.gltf/)
  assert.match(resolver, /uraiPromotedAssetPathOverrides\[assetId\] \?\? selectedAsset\.path/)
  assert.match(layer, /assetId="home-entry-chamber-model-v1"/)
})
