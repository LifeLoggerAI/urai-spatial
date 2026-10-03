import type { InterpretiveWorldAsset } from './interpretiveWorld'

export type InterpretiveWorldReplayBinding = {
  schemaVersion: 'urai-interpretive-world-replay-binding-1'
  memoryId: string
  interpretiveWorldAssetId: string
  memoryStarId: string
  returnContract: {
    focusMemoryId: string
    returnTo: 'focus' | 'life-map'
    preserveSelectedMemory: true
  }
}

export type InterpretiveWorldReplayPlan =
  | {
      mode: 'interpretive-world'
      assetId: string
      truthLabel: string
      returnTo: 'focus' | 'life-map'
      focusMemoryId: string
      autobiographical: false
    }
  | {
      mode: 'standard-replay'
      reason: string
      returnTo: 'focus' | 'life-map'
      focusMemoryId: string
    }

export function validateInterpretiveWorldReplayBinding(args: {
  asset: InterpretiveWorldAsset
  binding: InterpretiveWorldReplayBinding
}) {
  const { asset, binding } = args
  const errors: string[] = []
  if (binding.schemaVersion !== 'urai-interpretive-world-replay-binding-1') errors.push('UNSUPPORTED_INTERPRETIVE_WORLD_REPLAY_SCHEMA')
  if (binding.interpretiveWorldAssetId !== asset.id) errors.push('INTERPRETIVE_WORLD_ASSET_BINDING_MISMATCH')
  if (binding.returnContract.focusMemoryId !== binding.memoryId) errors.push('RETURN_MEMORY_ID_MISMATCH')
  if (binding.returnContract.preserveSelectedMemory !== true) errors.push('RETURN_MUST_PRESERVE_SELECTED_MEMORY')
  if (!binding.memoryStarId) errors.push('MEMORY_STAR_REQUIRED')
  if (asset.autobiographical !== false || asset.sourceTruthEligible !== false || asset.sourceIds.length !== 0) errors.push('INTERPRETIVE_WORLD_TRUTH_BOUNDARY_INVALID')
  return errors
}

export function buildInterpretiveWorldReplayPlan(args: {
  asset: InterpretiveWorldAsset
  binding: InterpretiveWorldReplayBinding
  interpretiveWorldAvailable: boolean
}): InterpretiveWorldReplayPlan {
  const { asset, binding, interpretiveWorldAvailable } = args
  const errors = validateInterpretiveWorldReplayBinding({ asset, binding })
  if (errors.length) {
    return {
      mode: 'standard-replay',
      reason: errors.join(','),
      returnTo: binding.returnContract.returnTo,
      focusMemoryId: binding.returnContract.focusMemoryId,
    }
  }
  if (!interpretiveWorldAvailable) {
    return {
      mode: 'standard-replay',
      reason: 'INTERPRETIVE_WORLD_UNAVAILABLE',
      returnTo: binding.returnContract.returnTo,
      focusMemoryId: binding.returnContract.focusMemoryId,
    }
  }
  if (asset.generation.visualAcceptance !== 'accepted' || asset.qa.reviewState !== 'accepted' || asset.release.browserCertified !== true) {
    return {
      mode: 'standard-replay',
      reason: 'INTERPRETIVE_WORLD_NOT_CERTIFIED',
      returnTo: binding.returnContract.returnTo,
      focusMemoryId: binding.returnContract.focusMemoryId,
    }
  }
  return {
    mode: 'interpretive-world',
    assetId: asset.id,
    truthLabel: asset.truthLabel,
    returnTo: binding.returnContract.returnTo,
    focusMemoryId: binding.returnContract.focusMemoryId,
    autobiographical: false,
  }
}
