import {
  getUraiSpatialAsset,
  getUraiSpatialFallbackAsset,
  type UraiSpatialAssetResolution,
} from '@/spatial/assets/assetManifest'
import {
  isUraiAssetPromoted,
  uraiPromotedAssetPathOverrides,
} from '@/spatial/assets/assetPromotionState'

export type HomeRuntimeAssetMode = 'ready' | 'review-candidate' | 'fallback' | 'unavailable'

export type HomeReviewCandidate = {
  readonly assetId: 'home-entry-chamber-model-v1' | 'portal-ring-master-glb-v1' | 'urai-orb-avatar-glb-v1'
  readonly candidateId: string
  readonly path: string
  readonly sha256: string
  readonly bytes: number
  readonly triangleCount: number
  readonly disposition: 'review-candidate' | 'technically-approved-visually-pending'
  readonly artifactId: number
  readonly artifactDigest: string
  readonly source: string
  readonly license: string
}

export const homeReviewCandidates: readonly HomeReviewCandidate[] = [
  {
    assetId: 'home-entry-chamber-model-v1',
    candidateId: 'home-entry-chamber-v1@restored-51db',
    path: '/assets/urai/generated/models/home-entry-chamber-v1.glb',
    sha256: 'b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529',
    bytes: 184160,
    triangleCount: 12934,
    disposition: 'review-candidate',
    artifactId: 8710341852,
    artifactDigest: 'sha256:b14c3cfb15e58aa8a4bbe776a8ac1093f91541dcf7e1b56e999d96aeec687078',
    source: 'Unchanged reviewed Home source recovered from 51db7b3ba77a657659da34ca5e146e049dd03d31; current-head acceptance pending',
    license: 'URAI Labs internal production asset',
  },
  {
    assetId: 'portal-ring-master-glb-v1',
    candidateId: 'portal-ring-master-v1@forge-2026-07-23',
    path: '/assets/urai/generated/models/portal-ring-master-v1.glb',
    sha256: '578bcc59ac90d7df5193fc67cf94efbd4b663a2035a1cd807d494a294c3af00f',
    bytes: 32912,
    triangleCount: 1560,
    disposition: 'review-candidate',
    artifactId: 8577690093,
    artifactDigest: 'sha256:6c0c5b0e0207086e0f254434e7310f5c2fdaebfb3f969dae9a58a281ef477ca0',
    source: 'URAI deterministic candidate forge, exact Actions run 30042154450',
    license: 'URAI Labs internal production asset',
  },
  {
    assetId: 'urai-orb-avatar-glb-v1',
    candidateId: 'urai-orb-avatar-v1@forge-2026-07-23',
    path: '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    sha256: '83b252f0de613a60fffb15e07cdf4f02ca81b59aac5d5bfccce7ee716287f77d',
    bytes: 55980,
    triangleCount: 2784,
    disposition: 'technically-approved-visually-pending',
    artifactId: 8577690093,
    artifactDigest: 'sha256:6c0c5b0e0207086e0f254434e7310f5c2fdaebfb3f969dae9a58a281ef477ca0',
    source: 'URAI deterministic candidate forge, exact Actions run 30042154450',
    license: 'URAI Labs internal production asset',
  },
]

export type HomeRuntimeAssetResolution = {
  readonly assetId: HomeReviewCandidate['assetId']
  readonly mode: HomeRuntimeAssetMode
  readonly path: string | null
  readonly canonical: UraiSpatialAssetResolution
  readonly reviewCandidate: HomeReviewCandidate | null
}

function canonicalResolution(assetId: HomeReviewCandidate['assetId']): UraiSpatialAssetResolution {
  const selectedAsset = getUraiSpatialAsset(assetId)
  const fallbackAsset = getUraiSpatialFallbackAsset(assetId)
  const promotedCandidate = homeReviewCandidates.find((candidate) => candidate.assetId === assetId) ?? null

  // Governed promotion is the release authority for generated Home assets. The
  // original catalog status describes the pre-promotion intake state and must not
  // force a promoted, receipted asset back to the procedural fallback.
  if (
    selectedAsset &&
    selectedAsset.status !== 'missing' &&
    isUraiAssetPromoted(assetId)
  ) {
    return {
      requestedAssetId: assetId,
      source: 'selected',
      path: uraiPromotedAssetPathOverrides[assetId] ?? promotedCandidate?.path ?? selectedAsset.path,
      selectedAsset,
      fallbackAsset,
    }
  }

  if (fallbackAsset?.status === 'fallback') {
    return {
      requestedAssetId: assetId,
      source: 'fallback',
      path: fallbackAsset.path,
      selectedAsset,
      fallbackAsset,
    }
  }

  return {
    requestedAssetId: assetId,
    source: 'unavailable',
    path: null,
    selectedAsset,
    fallbackAsset,
  }
}

export function resolveHomeRuntimeAsset(
  assetId: HomeReviewCandidate['assetId'],
  allowDisclosedReviewCandidate: boolean,
): HomeRuntimeAssetResolution {
  const canonical = canonicalResolution(assetId)

  if (canonical.source === 'selected' && canonical.path) {
    return { assetId, mode: 'ready', path: canonical.path, canonical, reviewCandidate: null }
  }

  const reviewCandidate = homeReviewCandidates.find((candidate) => candidate.assetId === assetId) ?? null
  if (allowDisclosedReviewCandidate && reviewCandidate) {
    return { assetId, mode: 'review-candidate', path: reviewCandidate.path, canonical, reviewCandidate }
  }

  if (canonical.source === 'fallback' && canonical.path) {
    return { assetId, mode: 'fallback', path: canonical.path, canonical, reviewCandidate: null }
  }

  return { assetId, mode: 'unavailable', path: null, canonical, reviewCandidate }
}
