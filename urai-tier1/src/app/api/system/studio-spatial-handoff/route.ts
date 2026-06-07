import { NextResponse } from 'next/server'

import {
  STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION,
  validateStudioSpatialExport,
  type StudioSpatialExport,
} from '@/lib/studio-spatial-handoff'
import { jsonHeaders, URAI_SPATIAL_SERVICE } from '@/lib/spatial-system-contract'

export const dynamic = 'force-dynamic'

const sampleRuntimeTargets = ['web-spatial', 'webxr-disabled', 'quest-vr-disabled', 'visionos-disabled', 'ar-handheld-disabled'] as const

const sampleExport: StudioSpatialExport = {
  contractVersion: STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION,
  producer: 'urai-studio',
  consumer: 'urai-spatial',
  exportId: 'sample-export',
  projectId: 'sample-project',
  tenantId: 'sample-tenant',
  createdAt: '2026-06-07T00:00:00.000Z',
  runtimeTargets: [...sampleRuntimeTargets],
  sceneManifest: {
    sceneId: 'sample-scene',
    title: 'Sample URAI Spatial Scene',
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
      assetId: 'sample-scene-json',
      kind: 'scene-json',
      uri: 'https://example.urai.app/spatial/sample-scene.json',
      mimeType: 'application/json',
      checksum: 'sha256-sample',
      scope: 'tenant-scoped',
      fallbackUri: 'https://example.urai.app/spatial/fallback-scene.json',
    },
  ],
  consentReceipt: {
    receiptId: 'sample-consent-receipt',
    tenantId: 'sample-tenant',
    userId: 'sample-user',
    purpose: 'Render a tenant-scoped URAI Studio spatial export.',
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
}

export async function GET() {
  const validation = validateStudioSpatialExport(sampleExport)

  return NextResponse.json(
    {
      ok: validation.ok,
      service: URAI_SPATIAL_SERVICE,
      endpoint: '/api/system/studio-spatial-handoff',
      contractVersion: STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION,
      producer: 'urai-studio',
      consumer: 'urai-spatial',
      acceptedRuntimeTargets: validation.acceptedRuntimeTargets,
      rejectedRuntimeTargets: validation.rejectedRuntimeTargets,
      requiredRuntimeTarget: 'web-spatial',
      disabledRuntimeTargets: ['webxr-disabled', 'quest-vr-disabled', 'visionos-disabled', 'ar-handheld-disabled'],
      requiredFields: [
        'contractVersion',
        'producer',
        'consumer',
        'exportId',
        'projectId',
        'tenantId',
        'createdAt',
        'sceneManifest',
        'assetManifest',
        'consentReceipt',
        'safetyBoundaries',
        'runtimeTargets',
      ],
      validator: {
        source: 'urai-tier1/src/lib/studio-spatial-handoff.ts',
        functionName: 'validateStudioSpatialExport',
        validation,
      },
      liveClaimBoundary:
        'Only web-spatial is assumed live by default. WebXR, Quest VR, VisionOS, and handheld AR must remain disabled until release evidence validates them.',
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        ...jsonHeaders(),
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
