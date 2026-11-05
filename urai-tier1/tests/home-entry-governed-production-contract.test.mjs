import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'
import { HOME_NORMAL_PREDECESSOR, verifyHomeNormalRepair } from '../../scripts/lib/home-normal-repair.mjs'
import { verifyGlbNormalIntegrity } from '../../scripts/lib/glb-normal-integrity.mjs'

const binary = fs.readFileSync('public/assets/urai/generated/models/home-entry-chamber-v1.glb')
const launchManifest = JSON.parse(fs.readFileSync('../operations/assets/launch-critical-assets.json', 'utf8'))
const receipt = JSON.parse(fs.readFileSync('../operations/assets/production-receipts/home-entry-chamber-v1.json', 'utf8'))
const decision = JSON.parse(fs.readFileSync('../operations/assets/promotion-decisions/home-entry-chamber-v1.json', 'utf8'))
const promotionState = fs.readFileSync('src/spatial/assets/assetPromotionState.ts', 'utf8')
const production = fs.readFileSync('src/spatial/layout/HomeWorldProductionPolished.tsx', 'utf8')
const home = launchManifest.assets.find(asset => asset.id === 'home-entry-chamber-v1')

test('binds the exact NORMAL-only successor while current Home approval remains pending', async () => {
  assert.equal(binary.length, 186040)
  assert.equal(crypto.createHash('sha256').update(binary).digest('hex'), '808d6a7e0a64aa9f69f10aabf8134bd6b5e0f2335afc1e83e21fa11fa2f35e17')
  assert.equal(receipt.bytes, binary.length)
  assert.equal(receipt.sha256, crypto.createHash('sha256').update(binary).digest('hex'))
  assert.equal(home.releaseState, 'pending-final-review')
  assert.equal(receipt.releaseState, home.releaseState)
  assert.equal(home.requiredCompression, 'draco-or-meshopt')
  assert.equal(home.source, receipt.source)
  assert.equal(home.license, receipt.license)
  assert.equal(home.fallback, decision.fallback)
  const proof = await verifyHomeNormalRepair(fs.readFileSync(`../${HOME_NORMAL_PREDECESSOR.archivePath}`), binary)
  assert.equal(proof.changedNormalVectors, 14)
  assert.equal(proof.geometryTopologyMaterialsNodesSkinsAnimationsUntouched, true)
  assert.equal((await verifyGlbNormalIntegrity(binary)).checkedVectors, 4236)
})

test('retains historical independent acceptance without transferring current deployment or visual approval', () => {
  assert.equal(receipt.visualAcceptance.accepted, false)
  assert.equal(receipt.historicalAcceptance.visualAcceptance.accepted, true)
  assert.equal(receipt.historicalAcceptance.visualAcceptance.continuousSpatialVisualProofRunId, 30432962277)
  assert.equal(receipt.historicalAcceptance.visualAcceptance.independentProofPullRequest, 968)
  assert.equal(receipt.acceptedSourceHead, '51db7b3ba77a657659da34ca5e146e049dd03d31')
  assert.equal(receipt.compressionStatus, 'meshopt')
  assert.equal(receipt.deploymentAuthorized, false)
  assert.equal(receipt.paidExecutionAuthorized, false)
  assert.equal(receipt.restoredSource.bytesChangedFromAcceptedSource, true)
  assert.equal(receipt.restoredSource.geometryChangedFromAcceptedSource, false)
  assert.equal(receipt.normalRepair.visualAcceptance, false)
  assert.equal(receipt.normalRepair.exactHeadChecksPassed, false)
  assert.equal(receipt.restoredSource.currentReleaseAccepted, false)
  assert.equal(receipt.measured.animationPoseEnvelopeVerified, false)
})

test('current decision rehearses source restoration and preserves prior promotion separately', () => {
  assert.equal(decision.mode, 'rehearsal')
  assert.equal(decision.promote, false)
  assert.equal(decision.humanReviewApproved, false)
  assert.equal(decision.visualProofVerified, false)
  assert.equal(decision.exactHeadChecksPassed, false)
  assert.equal(decision.deploymentAuthorized, false)
  assert.equal(decision.receiptPath, undefined)
  assert.equal(decision.historicalPromotion.mode, 'promotion')
  assert.equal(decision.historicalPromotion.sha256, HOME_NORMAL_PREDECESSOR.sha256)
  assert.notEqual(decision.historicalPromotion.sha256, receipt.sha256)
  assert.equal(decision.historicalPromotion.bytes, HOME_NORMAL_PREDECESSOR.bytes)
  assert.notEqual(decision.historicalPromotion.bytes, receipt.bytes)
  assert.notEqual(decision.producer, decision.reviewer)
})

test('settled Home loads the canonical candidate GLB while current runtime promotion remains pending', () => {
  assert.doesNotMatch(promotionState, /'home-entry-chamber-model-v1'/)
  assert.doesNotMatch(promotionState, /home-entry-chamber-v1\.gltf/)
  assert.match(production, /const HOME_SANCTUARY_MODEL = '\/assets\/urai\/generated\/models\/home-entry-chamber-v1\.glb'/)
  assert.match(production, /useGLTF\(HOME_SANCTUARY_MODEL\)/)
})
