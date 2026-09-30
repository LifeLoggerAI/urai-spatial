import type { CapturedRealityAsset, CapturedRealityRenderDecision } from '@/spatial/captured-reality/capturedReality'
import type { MemoryTruthClass, MemoryWorldAsset, MemoryWorldLayer } from './memoryWorld'

export const MEMORY_WORLD_CAPTURED_REALITY_ADAPTER_VERSION = 'urai-memory-world-captured-reality-adapter-1' as const

export function memoryTruthFromCapturedReality(asset: CapturedRealityAsset): MemoryTruthClass {
  if (asset.truthClass === 'spatially-reconstructable') return 'T2_SPATIALLY_RECONSTRUCTED'
  if (asset.truthClass === 'interpretive') return 'T6_INTERPRETIVE'
  if (asset.truthClass === 'unknown') return 'T7_UNKNOWN'
  return 'T1_SOURCE_DERIVED'
}

export function capturedRealityMemoryWorldAsset(asset: CapturedRealityAsset): MemoryWorldAsset {
  const truthClass = memoryTruthFromCapturedReality(asset)
  return {
    assetId: asset.id,
    assetType: 'capture',
    name: asset.label,
    version: asset.schemaVersion,
    semanticTags: ['captured-reality', 'place-reconstruction', asset.anchorEntityId],
    representation: ['gaussian-splat', ...(asset.reconstruction.fallbackMesh ? ['mesh' as const] : [])],
    truthClass,
    confidence: asset.qa.reviewState === 'accepted' ? 1 : asset.qa.reviewState === 'rejected' ? 0 : 0.5,
    sourceIds: asset.sourceIds,
    dependencies: [
      ...(asset.reconstruction.fallbackMesh ? [asset.reconstruction.fallbackMesh.artifactId] : []),
      ...(asset.reconstruction.collisionProxy ? [asset.reconstruction.collisionProxy.artifactId] : []),
    ],
    optimizationTier: asset.performance?.profile ?? 'multi',
    checksum: asset.reconstruction.runtime.sha256,
    status: asset.qa.reviewState === 'accepted' && asset.release.browserCertified ? 'gold' : 'silver',
  }
}

export function capturedRealityMemoryWorldLayer(
  asset: CapturedRealityAsset,
  decision: CapturedRealityRenderDecision,
): MemoryWorldLayer {
  const truthClass = memoryTruthFromCapturedReality(asset)
  const representations: MemoryWorldLayer['representation'] =
    decision.mode === 'gaussian-splat'
      ? ['gaussian-splat']
      : decision.mode === 'mesh-fallback'
        ? ['mesh']
        : ['metadata']

  return {
    id: `layer:captured-reality:${asset.id}`,
    kind: 'captured-reality',
    truthClass,
    sourceIds: decision.allowedSourceIds,
    assetIds: [asset.id],
    representation: representations,
    confidence: asset.qa.reviewState === 'accepted' ? 1 : 0.5,
    visible: decision.mode === 'gaussian-splat' || decision.mode === 'mesh-fallback',
    autobiographical: decision.autobiographical && (truthClass === 'T1_SOURCE_DERIVED' || truthClass === 'T2_SPATIALLY_RECONSTRUCTED'),
    notes: [
      decision.truthLabel,
      `render-mode:${decision.mode}`,
      ...(decision.collisionArtifactId ? [`collision:${decision.collisionArtifactId}`] : ['collision:unverified']),
    ],
  }
}
