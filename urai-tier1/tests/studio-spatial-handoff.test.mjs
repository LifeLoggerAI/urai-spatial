import assert from 'node:assert/strict'
import test from 'node:test'

import { validateStudioSpatialExport } from '../src/lib/studio-spatial-handoff.ts'

function validExport(overrides = {}) {
  return {
    contractVersion: '0.1.0',
    producer: 'urai-studio',
    consumer: 'urai-spatial',
    exportId: 'export-1',
    projectId: 'project-1',
    tenantId: 'tenant-1',
    createdAt: '2026-06-07T00:00:00.000Z',
    runtimeTargets: ['web-spatial', 'webxr-disabled', 'quest-vr-disabled', 'visionos-disabled', 'ar-handheld-disabled'],
    sceneManifest: {
      sceneId: 'scene-1',
      title: 'Genesis Spatial Scene',
      worldType: 'genesis-home',
      cameraRig: { mode: 'orbit' },
      lightingProfile: { mood: 'calm' },
      groundLayer: { kind: 'terrain' },
      skyLayer: { kind: 'mood-weather' },
      orbLayer: { kind: 'companion' },
      weatherLayer: { kind: 'ambient' },
      memoryStarLayers: [],
      fallbackState: { mode: 'safe-empty' },
    },
    assetManifest: [
      {
        assetId: 'asset-1',
        kind: 'scene-json',
        uri: 'https://assets.urai.example/scene.json',
        mimeType: 'application/json',
        checksum: 'sha256-demo',
        scope: 'tenant-scoped',
        fallbackUri: 'https://assets.urai.example/fallback.json',
      },
    ],
    consentReceipt: {
      receiptId: 'receipt-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'Render a spatial export.',
      grantedCategories: ['generated_assets'],
      createdAt: '2026-06-07T00:00:00.000Z',
      retentionPolicyId: 'generated_assets_standard_retention',
    },
    safetyBoundaries: [
      {
        layer: 'mood-reflection',
        requiredLanguage: 'pattern_support_not_diagnosis',
        humanReviewRequired: false,
      },
    ],
    ...overrides,
  }
}

test('Studio Spatial handoff validator accepts launch-safe web-spatial exports', () => {
  const result = validateStudioSpatialExport(validExport())
  assert.equal(result.ok, true)
  assert.deepEqual(result.acceptedRuntimeTargets, ['web-spatial', 'webxr-disabled', 'quest-vr-disabled', 'visionos-disabled', 'ar-handheld-disabled'])
  assert.deepEqual(result.rejectedRuntimeTargets, [])
  assert.deepEqual(result.errors, [])
})

test('Studio Spatial handoff validator rejects wrong producer and consumer', () => {
  const result = validateStudioSpatialExport(validExport({ producer: 'unknown', consumer: 'other-system' }))
  assert.equal(result.ok, false)
  assert.ok(result.errors.includes('producer must be urai-studio'))
  assert.ok(result.errors.includes('consumer must be urai-spatial'))
})

test('Studio Spatial handoff validator rejects unsupported live XR targets', () => {
  const result = validateStudioSpatialExport(validExport({ runtimeTargets: ['web-spatial', 'webxr', 'quest-vr'] }))
  assert.equal(result.ok, false)
  assert.ok(result.rejectedRuntimeTargets.includes('webxr'))
  assert.ok(result.rejectedRuntimeTargets.includes('quest-vr'))
  assert.ok(result.errors.some((error) => error.includes('webxr must be represented as disabled')))
  assert.ok(result.errors.some((error) => error.includes('quest-vr must be represented as disabled')))
})

test('Studio Spatial handoff validator rejects missing consent receipt', () => {
  const payload = validExport()
  delete payload.consentReceipt
  const result = validateStudioSpatialExport(payload)
  assert.equal(result.ok, false)
  assert.ok(result.errors.includes('consentReceipt is required'))
})

test('Studio Spatial handoff validator rejects unsafe asset uri and mime type', () => {
  const payload = validExport({
    assetManifest: [
      {
        assetId: 'asset-1',
        kind: 'texture',
        uri: 'javascript:alert(1)',
        mimeType: 'application/x-msdownload',
        checksum: 'sha256-demo',
        scope: 'tenant-scoped',
      },
    ],
  })
  const result = validateStudioSpatialExport(payload)
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((error) => error.includes('uri must use https, ipfs, or gs')))
  assert.ok(result.errors.some((error) => error.includes('mimeType is not allowed')))
})

test('Studio Spatial handoff validator warns on user-scoped assets', () => {
  const payload = validExport({
    assetManifest: [
      {
        assetId: 'asset-1',
        kind: 'texture',
        uri: 'gs://urai-assets/private/texture.png',
        mimeType: 'image/png',
        checksum: 'sha256-demo',
        scope: 'user-scoped',
      },
    ],
  })
  const result = validateStudioSpatialExport(payload)
  assert.equal(result.ok, true)
  assert.ok(result.warnings.some((warning) => warning.includes('user-scoped')))
})
