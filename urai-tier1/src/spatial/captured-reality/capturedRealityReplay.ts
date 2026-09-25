import type { CapturedRealityAsset } from './capturedReality'
import type { LivedWorldGraph, MemoryEntity } from '@/spatial/lived-world/livedWorldGraph'

export type CapturedRealityMemoryAnchor = {
  id: string
  kind: 'photo' | 'video' | 'audio' | 'story' | 'object' | 'person-presence' | 'event'
  sourceId: string
  position: [number, number, number]
  rotation?: [number, number, number]
  label?: string
  occurredAt?: string
}

export type CapturedRealityReplayBinding = {
  schemaVersion: 'urai-captured-reality-replay-binding-1'
  ownerId: string
  memoryId: string
  placeEntityId: string
  capturedRealityAssetId: string
  memoryStarId: string
  lifeMapNodeId?: string
  anchors: readonly CapturedRealityMemoryAnchor[]
  returnContract: {
    focusMemoryId: string
    returnTo: 'focus' | 'life-map'
    preserveSelectedMemory: true
  }
}

export type CapturedRealityReplayPlan =
  | {
      mode: 'captured-place'
      assetId: string
      truthLabel: string
      anchors: readonly CapturedRealityMemoryAnchor[]
      returnTo: 'focus' | 'life-map'
      focusMemoryId: string
    }
  | {
      mode: 'standard-replay'
      reason: string
      returnTo: 'focus' | 'life-map'
      focusMemoryId: string
    }

function memoryEntity(graph: LivedWorldGraph, id: string): MemoryEntity | null {
  const entity = graph.entities[id]
  return entity?.kind === 'memory' ? entity : null
}

export function validateCapturedRealityReplayBinding(args: {
  graph: LivedWorldGraph
  asset: CapturedRealityAsset
  binding: CapturedRealityReplayBinding
}) {
  const { graph, asset, binding } = args
  const errors: string[] = []
  const memory = memoryEntity(graph, binding.memoryId)

  if (binding.schemaVersion !== 'urai-captured-reality-replay-binding-1') errors.push('UNSUPPORTED_REPLAY_BINDING_SCHEMA')
  if (binding.ownerId !== graph.ownerId || binding.ownerId !== asset.ownerId) errors.push('OWNER_MISMATCH')
  if (!memory) errors.push('MEMORY_ENTITY_MISSING')
  if (binding.capturedRealityAssetId !== asset.id) errors.push('ASSET_BINDING_MISMATCH')
  if (binding.placeEntityId !== asset.anchorEntityId) errors.push('PLACE_ASSET_ANCHOR_MISMATCH')
  if (memory && !memory.placeIds.includes(binding.placeEntityId)) errors.push('MEMORY_PLACE_MISMATCH')
  if (binding.returnContract.focusMemoryId !== binding.memoryId) errors.push('RETURN_MEMORY_ID_MISMATCH')
  if (binding.returnContract.preserveSelectedMemory !== true) errors.push('RETURN_MUST_PRESERVE_SELECTED_MEMORY')
  if (!binding.memoryStarId) errors.push('MEMORY_STAR_REQUIRED')

  const anchorIds = new Set<string>()
  for (const anchor of binding.anchors) {
    if (!anchor.id || anchorIds.has(anchor.id)) errors.push('DUPLICATE_OR_MISSING_ANCHOR_ID')
    anchorIds.add(anchor.id)
    if (!graph.sources[anchor.sourceId]) errors.push(`ANCHOR_SOURCE_MISSING:${anchor.sourceId}`)
    if (!anchor.position.every(Number.isFinite)) errors.push(`ANCHOR_POSITION_INVALID:${anchor.id}`)
  }

  return errors
}

export function buildCapturedRealityReplayPlan(args: {
  graph: LivedWorldGraph
  asset: CapturedRealityAsset
  binding: CapturedRealityReplayBinding
  capturedRealityAvailable: boolean
}): CapturedRealityReplayPlan {
  const { graph, asset, binding, capturedRealityAvailable } = args
  const errors = validateCapturedRealityReplayBinding({ graph, asset, binding })
  if (errors.length) {
    return {
      mode: 'standard-replay',
      reason: errors.join(','),
      returnTo: binding.returnContract.returnTo,
      focusMemoryId: binding.returnContract.focusMemoryId,
    }
  }

  if (!capturedRealityAvailable) {
    return {
      mode: 'standard-replay',
      reason: 'CAPTURED_REALITY_UNAVAILABLE',
      returnTo: binding.returnContract.returnTo,
      focusMemoryId: binding.returnContract.focusMemoryId,
    }
  }

  if (asset.truthClass !== 'spatially-reconstructable' || asset.qa.reviewState !== 'accepted') {
    return {
      mode: 'standard-replay',
      reason: 'CAPTURED_PLACE_NOT_SOURCE_REVIEWED',
      returnTo: binding.returnContract.returnTo,
      focusMemoryId: binding.returnContract.focusMemoryId,
    }
  }

  return {
    mode: 'captured-place',
    assetId: asset.id,
    truthLabel: 'Spatial reconstruction from recorded sources',
    anchors: binding.anchors,
    returnTo: binding.returnContract.returnTo,
    focusMemoryId: binding.returnContract.focusMemoryId,
  }
}
