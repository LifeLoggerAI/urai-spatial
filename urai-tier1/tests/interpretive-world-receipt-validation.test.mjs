import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const validator = new URL('../../scripts/validate-interpretive-world-receipt.mjs', import.meta.url)
const pendingReceipt = new URL('../../operations/captured-reality/worlds/URAI-IW-001-QUIET-RESET/reconstruction-receipt.pending.json', import.meta.url)

function acceptedVisualReceipt(receipt) {
  const generation = receipt.generation
  return {
    schemaVersion: 'urai-interpretive-world-visual-acceptance-1',
    worldId: receipt.worldId,
    truthClass: 'interpretive',
    autobiographical: false,
    classification: 'ACCEPTED',
    review: {
      overallAccepted: true,
      geometryConsistencyAccepted: true,
      reviewer: receipt.visual.reviewer ?? 'independent-reviewer',
      reviewedAt: receipt.visual.reviewedAt ?? '2026-09-30T00:00:00Z',
      notes: 'Unit fixture for accepted visual-review binding.',
    },
    items: [
      { role: 'hero', id: 'H00', taskId: generation.heroTaskId, status: 'accepted', notes: '' },
      ...generation.anchorTaskIds.map((taskId, index) => ({ role: 'anchor', id: `A0${index + 1}`, taskId, status: 'accepted', notes: '' })),
      ...generation.surveyTaskIds.map((taskId, index) => ({ role: 'survey', id: `S${String(index + 1).padStart(2, '0')}`, taskId, status: 'accepted', notes: '' })),
    ],
    allowedClaim: 'Visual accepted for interpretive reconstruction input.',
  }
}

function run(receipt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-iw-receipt-'))
  const file = path.join(dir, 'receipt.json')
  fs.writeFileSync(file, JSON.stringify(receipt))
  if (receipt.visual?.literalAcceptance === true && typeof receipt.visual?.receiptRef === 'string') {
    fs.writeFileSync(path.join(dir, receipt.visual.receiptRef), JSON.stringify(acceptedVisualReceipt(receipt)))
  }
  const result = spawnSync(process.execPath, [validator.pathname, file], { encoding: 'utf8' })
  fs.rmSync(dir, { recursive: true, force: true })
  return result
}

test('checked-in World 001 pending receipt is truthfully valid without overstating reconstruction', () => {
  const result = spawnSync(process.execPath, [validator.pathname, pendingReceipt.pathname], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /PRE_RECONSTRUCTION/)
})

test('PRE_RECONSTRUCTION cannot claim certification or accepted reconstruction', () => {
  const source = JSON.parse(fs.readFileSync(pendingReceipt, 'utf8'))
  source.certification.browserCertified = true
  source.allowedClaim = 'Browser certified and reconstruction accepted'
  const result = run(source)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /cannot claim device certification|overstates readiness/)
})

test('accepted reconstruction enforces visual, frame, camera, training, QA and archival gates', () => {
  const source = JSON.parse(fs.readFileSync(pendingReceipt, 'utf8'))
  source.classification = 'RECONSTRUCTION_ACCEPTED'
  source.visual = {
    literalAcceptance: true,
    geometryConsistencyAccepted: true,
    acceptedTaskIds: [source.generation.heroTaskId, ...source.generation.anchorTaskIds, ...source.generation.surveyTaskIds],
    reviewer: 'independent-reviewer',
    reviewedAt: '2026-09-30T00:00:00Z',
    receiptRef: 'visual-acceptance.json',
  }
  source.frames = { acceptedFrameCount: 140, heldOutFrameCount: 14, frameManifestRef: 'frames.json' }
  source.cameraSolve = {
    engine: 'colmap',
    registeredImages: 126,
    totalInputImages: 140,
    meanReprojectionErrorPx: 0.8,
    fixedLensFocalSpread: 0.02,
    receiptRef: 'camera.json',
  }
  source.training = { state: 'complete', engine: 'nerfstudio-splatfacto', receiptRef: 'training.json' }
  source.qa = { reviewState: 'accepted', psnrDb: 27, ssim: 0.91, lpips: 0.15, knownArtifactCount: 0, receiptRef: 'qa.json' }
  source.artifacts.archival = { artifactId: 'archive-1', format: 'ply-3dgs', sha256: 'a'.repeat(64), byteSize: 200000000 }
  source.allowedClaim = 'Interpretive 3D reconstruction accepted; device runtime is not certified.'
  const result = run(source)
  assert.equal(result.status, 0, result.stderr || result.stdout)
})

test('browser readiness requires bounded splat plus a 45 fps 30-second desktop receipt', () => {
  const source = JSON.parse(fs.readFileSync(pendingReceipt, 'utf8'))
  source.classification = 'BROWSER_RUNTIME_READY'
  source.visual = {
    literalAcceptance: true,
    geometryConsistencyAccepted: true,
    acceptedTaskIds: [source.generation.heroTaskId, ...source.generation.anchorTaskIds, ...source.generation.surveyTaskIds],
    reviewer: 'independent-reviewer',
    reviewedAt: '2026-09-30T00:00:00Z',
    receiptRef: 'visual-acceptance.json',
  }
  source.frames = { acceptedFrameCount: 140, heldOutFrameCount: 14, frameManifestRef: 'frames.json' }
  source.cameraSolve = {
    engine: 'colmap', registeredImages: 126, totalInputImages: 140,
    meanReprojectionErrorPx: 0.8, fixedLensFocalSpread: 0.02, receiptRef: 'camera.json',
  }
  source.training = { state: 'complete', engine: 'nerfstudio-splatfacto', receiptRef: 'training.json' }
  source.qa = { reviewState: 'accepted', psnrDb: 27, ssim: 0.91, lpips: 0.15, knownArtifactCount: 0, receiptRef: 'qa.json' }
  source.artifacts.archival = { artifactId: 'archive-1', format: 'ply-3dgs', sha256: 'a'.repeat(64), byteSize: 200000000 }
  source.artifacts.runtime = { artifactId: 'runtime-1', format: 'splat', sha256: 'b'.repeat(64), byteSize: 120 * 1024 * 1024 }
  source.performance.desktop = {
    tier: 'desktop', runtimeBytes: 120 * 1024 * 1024, sustainedFps: 46, sampleSeconds: 30,
    deviceLabel: 'desktop-proof', measuredAt: '2026-09-30T00:00:00Z',
  }
  source.certification.browserCertified = true
  source.allowedClaim = 'Browser runtime ready for interpretive generated world.'
  const result = run(source)
  assert.equal(result.status, 0, result.stderr || result.stdout)

  source.performance.desktop.sustainedFps = 44
  const bad = run(source)
  assert.notEqual(bad.status, 0)
  assert.match(bad.stderr, /desktop performance receipt invalid/)
})

test('XR can never inherit browser or mobile readiness without its own physical-device receipt', () => {
  const source = JSON.parse(fs.readFileSync(pendingReceipt, 'utf8'))
  source.classification = 'XR_RUNTIME_READY'
  source.visual = {
    literalAcceptance: true,
    geometryConsistencyAccepted: true,
    acceptedTaskIds: [source.generation.heroTaskId, ...source.generation.anchorTaskIds, ...source.generation.surveyTaskIds],
    reviewer: 'independent-reviewer',
    reviewedAt: '2026-09-30T00:00:00Z',
    receiptRef: 'visual-acceptance.json',
  }
  source.frames = { acceptedFrameCount: 140, heldOutFrameCount: 14, frameManifestRef: 'frames.json' }
  source.cameraSolve = {
    engine: 'colmap', registeredImages: 126, totalInputImages: 140,
    meanReprojectionErrorPx: 0.8, fixedLensFocalSpread: 0.02, receiptRef: 'camera.json',
  }
  source.training = { state: 'complete', engine: 'nerfstudio-splatfacto', receiptRef: 'training.json' }
  source.qa = { reviewState: 'accepted', psnrDb: 27, ssim: 0.91, lpips: 0.15, knownArtifactCount: 0, receiptRef: 'qa.json' }
  source.artifacts.archival = { artifactId: 'archive-1', format: 'ply-3dgs', sha256: 'a'.repeat(64), byteSize: 200000000 }
  source.artifacts.runtime = { artifactId: 'runtime-1', format: 'splat', sha256: 'b'.repeat(64), byteSize: 60 * 1024 * 1024 }
  source.performance.desktop = { tier: 'desktop', runtimeBytes: 60 * 1024 * 1024, sustainedFps: 50, sampleSeconds: 30, deviceLabel: 'desktop', measuredAt: '2026-09-30T00:00:00Z' }
  source.performance.mobile = { tier: 'mobile', runtimeBytes: 60 * 1024 * 1024, sustainedFps: 31, sampleSeconds: 30, deviceLabel: 'mobile', measuredAt: '2026-09-30T00:00:00Z' }
  source.certification.browserCertified = true
  source.certification.mobileCertified = true
  source.allowedClaim = 'XR runtime ready.'
  const result = run(source)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /XR performance receipt invalid|xrCertified=true/)
})
