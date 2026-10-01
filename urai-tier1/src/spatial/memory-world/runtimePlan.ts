import type { MemoryTruthClass, MemoryWorld, MemoryWorldLayerKind, MemoryWorldRepresentation, MemoryWorldValidationContext } from './memoryWorld'
import { validateMemoryWorld } from './memoryWorld'

export const MEMORY_WORLD_RUNTIME_VERSION = 'urai-memory-world-runtime-1' as const

export type MemoryWorldNavigationMode = 'bounded-orbit' | 'walkable-proxy' | 'suppressed'

export type MemoryWorldRuntimeLayerPlan = {
  id: string
  kind: MemoryWorldLayerKind
  truthClass: MemoryTruthClass
  representation: readonly MemoryWorldRepresentation[]
  autobiographical: boolean
  visible: boolean
  systemProvided: boolean
}

export type MemoryWorldRuntimePlan = {
  runtimeVersion: typeof MEMORY_WORLD_RUNTIME_VERSION
  worldId: string
  valid: boolean
  errors: readonly string[]
  navigation: MemoryWorldNavigationMode
  truthLabel: string
  layers: readonly MemoryWorldRuntimeLayerPlan[]
}

const systemKinds: readonly MemoryWorldLayerKind[] = [
  'world-coordinates',
  'lighting',
  'emotional-presentation',
  'accessibility',
  'semantic-metadata',
  'provenance',
  'truth',
  'interaction-navigation',
  'runtime-optimization',
]

const autobiographicalTruth = new Set<MemoryTruthClass>([
  'T0_SOURCE_CAPTURED',
  'T1_SOURCE_DERIVED',
  'T2_SPATIALLY_RECONSTRUCTED',
  'T3_EVIDENCE_INFERRED',
])

function truthLabel(world: MemoryWorld) {
  const truth = new Set(world.layers.filter((layer) => layer.visible).map((layer) => layer.truthClass))
  if (truth.has('T0_SOURCE_CAPTURED') || truth.has('T1_SOURCE_DERIVED') || truth.has('T2_SPATIALLY_RECONSTRUCTED')) {
    return 'Evidence-backed Memory World · inspect provenance for reconstructed elements'
  }
  if (truth.has('T3_EVIDENCE_INFERRED')) {
    return 'Evidence-informed Memory World · inferred elements remain visibly bounded'
  }
  if (truth.has('T4_CONTEXT_TEMPLATE')) {
    return 'Context template · not recorded history'
  }
  if (truth.has('T5_GENERATED_FILL')) {
    return 'Generated context · not recorded history'
  }
  if (truth.has('T6_INTERPRETIVE')) {
    return 'Interpretive Memory World · not recorded history'
  }
  return 'Memory World context unresolved'
}

function hasSafeWalkableProxy(world: MemoryWorld) {
  return world.layers.some((layer) =>
    layer.kind === 'interaction-navigation'
    && layer.visible
    && (layer.representation.includes('mesh') || layer.representation.includes('procedural')),
  )
}

export function buildMemoryWorldRuntimePlan(world: MemoryWorld, validationContext: MemoryWorldValidationContext = {}): MemoryWorldRuntimePlan {
  const errors = validateMemoryWorld(world, validationContext)
  const existingKinds = new Set(world.layers.map((layer) => layer.kind))
  const layers: MemoryWorldRuntimeLayerPlan[] = world.layers.map((layer) => ({
    id: layer.id,
    kind: layer.kind,
    truthClass: layer.truthClass,
    representation: layer.representation,
    autobiographical: layer.autobiographical && autobiographicalTruth.has(layer.truthClass),
    visible: layer.visible,
    systemProvided: false,
  }))

  for (const kind of systemKinds) {
    if (existingKinds.has(kind)) continue
    layers.push({
      id: `system:${kind}`,
      kind,
      truthClass: 'T4_CONTEXT_TEMPLATE',
      representation: kind === 'lighting' || kind === 'interaction-navigation' ? ['procedural'] : ['metadata'],
      autobiographical: false,
      visible: kind === 'lighting' || kind === 'interaction-navigation',
      systemProvided: true,
    })
  }

  const capturedVisual = world.layers.some((layer) => layer.kind === 'captured-reality' && layer.visible)
  const navigation: MemoryWorldNavigationMode = errors.length
    ? 'suppressed'
    : hasSafeWalkableProxy(world)
      ? 'walkable-proxy'
      : 'bounded-orbit'

  return {
    runtimeVersion: MEMORY_WORLD_RUNTIME_VERSION,
    worldId: world.worldId,
    valid: errors.length === 0,
    errors,
    navigation: capturedVisual && navigation === 'bounded-orbit' ? 'bounded-orbit' : navigation,
    truthLabel: truthLabel(world),
    layers,
  }
}
