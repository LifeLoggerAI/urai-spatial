#!/usr/bin/env node
import fs from 'node:fs'

const path = process.argv[2]
if (!path) throw new Error('usage: validate-interpretive-world-receipt.mjs <receipt.json>')
const receipt = JSON.parse(fs.readFileSync(path, 'utf8'))
const failures = []
const need = (ok, message) => { if (!ok) failures.push(message) }

const MiB = 1024 * 1024
const classifications = [
  'PRE_RECONSTRUCTION',
  'RECONSTRUCTION_ACCEPTED',
  'BROWSER_RUNTIME_READY',
  'MOBILE_RUNTIME_READY',
  'XR_RUNTIME_READY',
]

need(receipt?.schemaVersion === 'urai-interpretive-world-reconstruction-receipt-1', 'supported interpretive-world receipt schemaVersion required')
need(typeof receipt?.worldId === 'string' && receipt.worldId.trim().length > 0, 'worldId required')
need(receipt?.truth?.truthClass === 'interpretive', 'truthClass must remain interpretive')
need(receipt?.truth?.autobiographical === false, 'interpretive world cannot be autobiographical')
need(receipt?.truth?.generatedOnly === true, 'generatedOnly=true required')
need(receipt?.truth?.sourceTruthEligible === false, 'sourceTruthEligible=false required')
need(Array.isArray(receipt?.truth?.sourceIds) && receipt.truth.sourceIds.length === 0, 'generated world sourceIds must remain empty')
need(receipt?.truth?.exactPrivateLocationEmbedded === false, 'generated world cannot embed exact private-location authority')
need(classifications.includes(receipt?.classification), 'recognized classification required')
need(typeof receipt?.visual?.literalAcceptance === 'boolean', 'visual.literalAcceptance boolean required')
need(Number.isSafeInteger(receipt?.frames?.acceptedFrameCount) && receipt.frames.acceptedFrameCount >= 0, 'acceptedFrameCount must be a non-negative integer')
need(Number.isSafeInteger(receipt?.frames?.heldOutFrameCount) && receipt.frames.heldOutFrameCount >= 0, 'heldOutFrameCount must be a non-negative integer')

const certification = receipt?.certification ?? {}
for (const key of ['browserCertified', 'mobileCertified', 'xrCertified']) {
  need(typeof certification[key] === 'boolean', `certification.${key} boolean required`)
}

const claim = String(receipt?.allowedClaim ?? '')
const rank = classifications.indexOf(receipt?.classification)
const reconstructionAccepted = rank >= classifications.indexOf('RECONSTRUCTION_ACCEPTED')

if (!reconstructionAccepted) {
  need(receipt.classification === 'PRE_RECONSTRUCTION', 'unaccepted reconstruction must remain PRE_RECONSTRUCTION')
  need(receipt.visual.literalAcceptance === false, 'PRE_RECONSTRUCTION must not claim literal visual acceptance')
  need(certification.browserCertified === false && certification.mobileCertified === false && certification.xrCertified === false, 'PRE_RECONSTRUCTION cannot claim device certification')
  need(!/(reconstruction accepted|runtime ready|browser certified|mobile certified|xr certified|launch ready)/i.test(claim), 'PRE_RECONSTRUCTION allowedClaim overstates readiness')
}

function validSha(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}

function validPerformance(receiptValue, tier, maxBytes, minFps) {
  if (!receiptValue || receiptValue.tier !== tier) return false
  if (!Number.isSafeInteger(receiptValue.runtimeBytes) || receiptValue.runtimeBytes <= 0 || receiptValue.runtimeBytes > maxBytes) return false
  if (!Number.isFinite(receiptValue.sustainedFps) || receiptValue.sustainedFps < minFps) return false
  if (!Number.isFinite(receiptValue.sampleSeconds) || receiptValue.sampleSeconds < 30) return false
  if (typeof receiptValue.deviceLabel !== 'string' || !receiptValue.deviceLabel.trim()) return false
  if (!Number.isFinite(Date.parse(receiptValue.measuredAt))) return false
  return true
}

if (reconstructionAccepted) {
  need(receipt.visual.literalAcceptance === true, 'accepted reconstruction requires literal visual acceptance')
  need(typeof receipt.visual.receiptRef === 'string' && receipt.visual.receiptRef.trim().length > 0, 'visual acceptance receiptRef required')
  need(receipt.frames.acceptedFrameCount >= 120, 'accepted reconstruction requires at least 120 accepted frames')
  need(receipt.frames.heldOutFrameCount >= Math.ceil(receipt.frames.acceptedFrameCount * 0.10), 'held-out frame set must be at least 10% of accepted frames')

  const camera = receipt.cameraSolve
  need(camera && camera.engine === 'colmap', 'accepted reconstruction requires COLMAP camera solve')
  need(Number.isSafeInteger(camera?.registeredImages) && Number.isSafeInteger(camera?.totalInputImages) && camera.registeredImages > 0 && camera.totalInputImages > 0 && camera.registeredImages <= camera.totalInputImages, 'camera registration counts invalid')
  if (camera?.totalInputImages > 0) need(camera.registeredImages / camera.totalInputImages >= 0.70, 'camera registration ratio below 70% hard floor')
  need(Number.isFinite(camera?.meanReprojectionErrorPx) && camera.meanReprojectionErrorPx <= 1.5, 'mean reprojection error exceeds 1.5 px')
  need(Number.isFinite(camera?.fixedLensFocalSpread) && camera.fixedLensFocalSpread <= 0.05, 'fixed-lens focal spread exceeds 5%')
  need(typeof camera?.receiptRef === 'string' && camera.receiptRef.trim().length > 0, 'camera solve receiptRef required')

  need(receipt.training?.state === 'complete', '3DGS training must be complete')
  need(typeof receipt.training?.engine === 'string' && receipt.training.engine.trim().length > 0, 'training engine required')
  need(typeof receipt.training?.receiptRef === 'string' && receipt.training.receiptRef.trim().length > 0, 'training receiptRef required')

  const qa = receipt.qa
  need(qa?.reviewState === 'accepted', 'held-out QA review must be accepted')
  need(Number.isFinite(qa?.psnrDb) && qa.psnrDb >= 24, 'held-out PSNR below 24 dB')
  need(Number.isFinite(qa?.ssim) && qa.ssim >= 0.85, 'held-out SSIM below 0.85')
  need(Number.isFinite(qa?.lpips) && qa.lpips <= 0.25, 'held-out LPIPS above 0.25')
  need(Number.isSafeInteger(qa?.knownArtifactCount) && qa.knownArtifactCount >= 0, 'knownArtifactCount must be a non-negative integer')
  need(typeof qa?.receiptRef === 'string' && qa.receiptRef.trim().length > 0, 'QA receiptRef required')

  const archival = receipt.artifacts?.archival
  need(archival?.format === 'ply-3dgs', 'archival authority must be PLY 3DGS')
  need(validSha(archival?.sha256), 'archival sha256 required')
  need(Number.isSafeInteger(archival?.byteSize) && archival.byteSize > 0, 'archival byteSize required')

  if (receipt.embodiedMovementRequested === true) {
    const collision = receipt.artifacts?.collisionProxy
    need(Boolean(collision?.artifactId), 'embodied movement requires collision proxy')
    need(['glb', 'navmesh-json'].includes(collision?.format), 'collision proxy format invalid')
    need(validSha(collision?.sha256), 'collision proxy sha256 required')
  }
}

const browserReady = rank >= classifications.indexOf('BROWSER_RUNTIME_READY')
if (browserReady) {
  const runtime = receipt.artifacts?.runtime
  need(runtime?.format === 'splat', 'browser runtime currently requires .splat delivery')
  need(validSha(runtime?.sha256), 'runtime sha256 required')
  need(Number.isSafeInteger(runtime?.byteSize) && runtime.byteSize > 0 && runtime.byteSize <= 160 * MiB, 'desktop runtime asset exceeds 160 MiB budget')
  need(validPerformance(receipt.performance?.desktop, 'desktop', 160 * MiB, 45), 'desktop performance receipt invalid')
  need(certification.browserCertified === true, 'browser runtime classification requires browserCertified=true')
}

const mobileReady = rank >= classifications.indexOf('MOBILE_RUNTIME_READY')
if (mobileReady) {
  need(validPerformance(receipt.performance?.mobile, 'mobile', 64 * MiB, 30), 'mobile performance receipt invalid')
  need(certification.mobileCertified === true, 'mobile runtime classification requires mobileCertified=true')
}

const xrReady = rank >= classifications.indexOf('XR_RUNTIME_READY')
if (xrReady) {
  need(validPerformance(receipt.performance?.xr, 'xr', 96 * MiB, 72), 'XR performance receipt invalid')
  need(certification.xrCertified === true, 'XR runtime classification requires xrCertified=true')
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, schemaVersion: receipt.schemaVersion, classification: receipt.classification }, null, 2))
