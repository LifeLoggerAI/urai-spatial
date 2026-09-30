import type { CapturedRealityAsset } from '@/spatial/captured-reality/capturedReality'
import type { LivedWorldGraph } from '@/spatial/lived-world/livedWorldGraph'
import { hasFoundationalArchetype } from './sceneOntology'

export const MEMORY_WORLD_SCHEMA_VERSION = 'urai-memory-world-1' as const

export type MemoryTruthClass =
  | 'T0_SOURCE_CAPTURED'
  | 'T1_SOURCE_DERIVED'
  | 'T2_SPATIALLY_RECONSTRUCTED'
  | 'T3_EVIDENCE_INFERRED'
  | 'T4_CONTEXT_TEMPLATE'
  | 'T5_GENERATED_FILL'
  | 'T6_INTERPRETIVE'
  | 'T7_UNKNOWN'

export type MemoryWorldRepresentation =
  | 'gaussian-splat'
  | 'mesh'
  | 'procedural'
  | 'digital-human'
  | 'audio'
  | 'metadata'

export type MemoryWorldLayerKind =
  | 'world-coordinates'
  | 'structural-environment'
  | 'captured-reality'
  | 'materials'
  | 'objects'
  | 'terrain-vegetation'
  | 'people'
  | 'animals'
  | 'events'
  | 'weather-atmosphere'
  | 'lighting'
  | 'spatial-audio'
  | 'emotional-presentation'
  | 'accessibility'
  | 'personal-memory-overlay'
  | 'semantic-metadata'
  | 'provenance'
  | 'truth'
  | 'interaction-navigation'
  | 'runtime-optimization'

export type MemoryWorldSourceAuthority =
  | 'user-owned'
  | 'licensed'
  | 'public-domain'
  | 'cc0'
  | 'creative-commons'
  | 'government-open'
  | 'museum-open-access'
  | 'reference-only'
  | 'unknown'

export type ReusePermission = {
  referenceOnly: boolean
  trainingPermitted: boolean | null
  derivativeWorkPermitted: boolean | null
  productionAssetPermitted: boolean | null
  commercialUsePermitted: boolean | null
  redistributionPermitted: boolean | null
  attributionRequired: boolean | null
  reviewRequired: boolean
}

export type MemoryWorldSourceRef = {
  sourceId: string
  authority: MemoryWorldSourceAuthority
  locator?: string
  capturedAt?: string
  representedAt?: string
  checksum?: string
  licenseId?: string
  attribution?: string
  consentRef?: string
  culturalAuthorityRef?: string
  permissions: ReusePermission
}

export type MemoryWorldAsset = {
  assetId: string
  assetType:
    | 'scene'
    | 'architecture'
    | 'material'
    | 'object'
    | 'vegetation'
    | 'vehicle'
    | 'audio'
    | 'event'
    | 'person'
    | 'animal'
    | 'capture'
  name: string
  version: string
  parentFamily?: string
  semanticTags: readonly string[]
  geography?: {
    countryCode?: string
    region?: string
    locality?: string
    urbanity?: 'rural' | 'peri-urban' | 'urban' | 'mixed' | 'unknown'
    climate?: string
    biome?: string
    elevationBand?: string
  }
  dateRange?: { start?: string; end?: string }
  architecture?: {
    typology?: string
    constructionTradition?: string
    materials?: readonly string[]
    roofForm?: string
    foundation?: string
    density?: string
    renovationState?: string
  }
  culturalContext?: readonly string[]
  language?: readonly string[]
  signage?: readonly string[]
  observableContext?: {
    dwellingSize?: string
    infrastructure?: readonly string[]
    repairState?: string
    applianceAvailability?: readonly string[]
    technologyGeneration?: string
  }
  accessibility?: {
    stepFree?: boolean | null
    ramps?: boolean | null
    elevator?: boolean | null
    narrowPaths?: boolean | null
    seating?: boolean | null
    sensoryWarnings?: readonly string[]
  }
  sensitivity?: {
    sacredContext?: boolean
    indigenousContext?: boolean
    restrictedKnowledge?: boolean
    culturalAuthorityRequired?: boolean
    localConsultationRequired?: boolean
    griefSensitive?: boolean
    minorRelated?: boolean
    traumaticContext?: boolean
  }
  representation: readonly MemoryWorldRepresentation[]
  truthClass: MemoryTruthClass
  confidence: number
  sourceIds: readonly string[]
  dependencies: readonly string[]
  optimizationTier?: 'desktop' | 'mobile' | 'xr' | 'multi'
  checksum?: string
  status: 'reference' | 'blockout' | 'bronze' | 'silver' | 'gold' | 'gold-master'
}

export type MemoryWorldLayer = {
  id: string
  kind: MemoryWorldLayerKind
  truthClass: MemoryTruthClass
  sourceIds: readonly string[]
  assetIds: readonly string[]
  representation: readonly MemoryWorldRepresentation[]
  confidence: number
  visible: boolean
  autobiographical: boolean
  notes?: readonly string[]
}

export type MemoryWorldContext = {
  geography?: MemoryWorldAsset['geography']
  representedDate?: string
  eraPackId?: string
  architectureFamilyId?: string
  culturalContext: readonly string[]
  languages: readonly string[]
  climate?: string
  biome?: string
  weather?: string
  lightingPresetId?: string
  emotionalWeather?: 'Calm' | 'Reflective' | 'Energized' | 'Heavy' | 'Uncertain' | 'Hopeful'
}

export type MemoryWorld = {
  schemaVersion: typeof MEMORY_WORLD_SCHEMA_VERSION
  worldId: string
  ownerId: string
  archetypeId: string
  label: string
  graphRef?: string
  capturedRealityAssetIds: readonly string[]
  context: MemoryWorldContext
  layers: readonly MemoryWorldLayer[]
  sourceRegistry: Record<string, MemoryWorldSourceRef>
  assetRegistry: Record<string, MemoryWorldAsset>
  provenance: {
    createdAt: string
    exactSourceHead?: string
    userCorrectionRevision: number
    assemblyVersion: string
    sourceLineageComplete: boolean
  }
  governance: {
    privateByDefault: true
    culturalReviewRequired: boolean
    culturalReviewState: 'not-required' | 'pending' | 'accepted' | 'rejected'
    consentComplete: boolean
    licensingComplete: boolean
  }
  release: {
    state: 'draft' | 'private-pilot' | 'private-beta' | 'launch-enabled'
    desktopVerified: boolean
    mobileVerified: boolean
    xrVerified: boolean
  }
}

export type MemoryWorldValidationContext = {
  livedWorld?: LivedWorldGraph
  capturedReality?: Readonly<Record<string, CapturedRealityAsset>>
}

const clampConfidence = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1

const autobiographicalTruth = new Set<MemoryTruthClass>([
  'T0_SOURCE_CAPTURED',
  'T1_SOURCE_DERIVED',
  'T2_SPATIALLY_RECONSTRUCTED',
  'T3_EVIDENCE_INFERRED',
])

export function validateMemoryWorld(world: MemoryWorld, context: MemoryWorldValidationContext = {}) {
  const errors: string[] = []
  if (world.schemaVersion !== MEMORY_WORLD_SCHEMA_VERSION) errors.push('UNSUPPORTED_MEMORY_WORLD_SCHEMA')
  if (!world.worldId) errors.push('WORLD_ID_REQUIRED')
  if (!world.ownerId) errors.push('OWNER_ID_REQUIRED')
  if (!hasFoundationalArchetype(world.archetypeId)) errors.push('UNKNOWN_SCENE_ARCHETYPE')
  if (world.provenance.userCorrectionRevision < 0) errors.push('INVALID_USER_CORRECTION_REVISION')
  if (!world.provenance.assemblyVersion) errors.push('ASSEMBLY_VERSION_REQUIRED')
  if (!world.provenance.sourceLineageComplete) errors.push('SOURCE_LINEAGE_INCOMPLETE')
  if (!world.governance.privateByDefault) errors.push('MEMORY_WORLD_MUST_DEFAULT_PRIVATE')
  if (world.governance.culturalReviewRequired && world.governance.culturalReviewState !== 'accepted') {
    errors.push('CULTURAL_REVIEW_REQUIRED')
  }
  if (world.release.mobileVerified && !world.release.desktopVerified) errors.push('MOBILE_VERIFIED_WITHOUT_DESKTOP_BASELINE')
  if (world.release.xrVerified && !world.release.desktopVerified) errors.push('XR_VERIFIED_WITHOUT_DESKTOP_BASELINE')

  for (const [sourceId, source] of Object.entries(world.sourceRegistry)) {
    if (source.sourceId !== sourceId) errors.push(`SOURCE_ID_KEY_MISMATCH:${sourceId}`)
    if (source.authority === 'unknown') errors.push(`SOURCE_AUTHORITY_UNKNOWN:${sourceId}`)
    if (source.permissions.productionAssetPermitted === false && !source.permissions.referenceOnly) {
      errors.push(`PRODUCTION_PERMISSION_CONTRADICTION:${sourceId}`)
    }
    if (source.permissions.reviewRequired && source.permissions.productionAssetPermitted === true && !source.licenseId && source.authority !== 'user-owned') {
      errors.push(`LICENSE_REVIEW_EVIDENCE_REQUIRED:${sourceId}`)
    }
  }

  for (const layer of world.layers) {
    if (!layer.id) errors.push('LAYER_ID_REQUIRED')
    if (!clampConfidence(layer.confidence)) errors.push(`INVALID_LAYER_CONFIDENCE:${layer.id}`)
    for (const sourceId of layer.sourceIds) {
      if (!world.sourceRegistry[sourceId]) errors.push(`LAYER_SOURCE_MISSING:${layer.id}:${sourceId}`)
    }
    for (const assetId of layer.assetIds) {
      if (!world.assetRegistry[assetId]) errors.push(`LAYER_ASSET_MISSING:${layer.id}:${assetId}`)
    }
    if (layer.autobiographical && !autobiographicalTruth.has(layer.truthClass)) {
      errors.push(`NON_EVIDENTIARY_LAYER_MARKED_AUTOBIOGRAPHICAL:${layer.id}`)
    }
    if (layer.truthClass === 'T0_SOURCE_CAPTURED' && layer.representation.includes('gaussian-splat')) {
      errors.push(`GAUSSIAN_SPLAT_CANNOT_BE_T0_SOURCE_CAPTURED:${layer.id}`)
    }
  }

  for (const asset of Object.values(world.assetRegistry)) {
    if (!asset.assetId) errors.push('ASSET_ID_REQUIRED')
    if (!clampConfidence(asset.confidence)) errors.push(`INVALID_ASSET_CONFIDENCE:${asset.assetId}`)
    for (const sourceId of asset.sourceIds) {
      if (!world.sourceRegistry[sourceId]) errors.push(`ASSET_SOURCE_MISSING:${asset.assetId}:${sourceId}`)
    }
    if (asset.sensitivity?.culturalAuthorityRequired && !world.governance.culturalReviewRequired) {
      errors.push(`CULTURAL_AUTHORITY_NOT_ESCALATED:${asset.assetId}`)
    }
    if (asset.truthClass === 'T4_CONTEXT_TEMPLATE' || asset.truthClass === 'T5_GENERATED_FILL' || asset.truthClass === 'T6_INTERPRETIVE') {
      if (asset.status === 'gold-master' && !world.governance.licensingComplete) errors.push(`GOLD_MASTER_WITHOUT_LICENSING:${asset.assetId}`)
    }
  }

  if (context.livedWorld && context.livedWorld.ownerId !== world.ownerId) errors.push('LIVED_WORLD_OWNER_MISMATCH')
  for (const id of world.capturedRealityAssetIds) {
    const captured = context.capturedReality?.[id]
    if (!captured) errors.push(`CAPTURED_REALITY_ASSET_MISSING:${id}`)
    else if (captured.ownerId !== world.ownerId) errors.push(`CAPTURED_REALITY_OWNER_MISMATCH:${id}`)
  }

  if (world.release.state === 'launch-enabled') {
    if (!world.governance.consentComplete) errors.push('LAUNCH_WITHOUT_COMPLETE_CONSENT')
    if (!world.governance.licensingComplete) errors.push('LAUNCH_WITHOUT_COMPLETE_LICENSING')
    if (!world.release.desktopVerified) errors.push('LAUNCH_WITHOUT_DESKTOP_VERIFICATION')
  }

  return errors
}
