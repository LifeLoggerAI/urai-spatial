import type {
  MemoryTruthClass,
  MemoryWorld,
  MemoryWorldAsset,
  MemoryWorldContext,
  MemoryWorldLayer,
} from './memoryWorld'

export const MEMORY_WORLD_ASSEMBLY_VERSION = 'urai-memory-world-assembly-1' as const

export type MemoryEvidenceCandidate = {
  candidateId: string
  targetSemanticTag: string
  assetId?: string
  sourceIds: readonly string[]
  truthClass: MemoryTruthClass
  confidence: number
  userConfirmed: boolean
  captured: boolean
}

export type AssemblyInput = {
  worldId: string
  ownerId: string
  archetypeId: string
  label: string
  context: MemoryWorldContext
  sourceRegistry: MemoryWorld['sourceRegistry']
  assetRegistry: MemoryWorld['assetRegistry']
  templateAssetIds: readonly string[]
  evidence: readonly MemoryEvidenceCandidate[]
  createdAt: string
  exactSourceHead?: string
}

const truthPriority: Record<MemoryTruthClass, number> = {
  T0_SOURCE_CAPTURED: 700,
  T1_SOURCE_DERIVED: 600,
  T2_SPATIALLY_RECONSTRUCTED: 500,
  T3_EVIDENCE_INFERRED: 400,
  T4_CONTEXT_TEMPLATE: 300,
  T5_GENERATED_FILL: 200,
  T6_INTERPRETIVE: 100,
  T7_UNKNOWN: 0,
}

function candidateScore(candidate: MemoryEvidenceCandidate) {
  let score = truthPriority[candidate.truthClass]
  if (candidate.captured) score += 50
  if (candidate.userConfirmed) score += 25
  score += Math.max(0, Math.min(1, candidate.confidence))
  return score
}

export function chooseEvidenceWinner(candidates: readonly MemoryEvidenceCandidate[]) {
  return [...candidates]
    .sort((a, b) => candidateScore(b) - candidateScore(a) || a.candidateId.localeCompare(b.candidateId))[0] ?? null
}

export function resolvePersonalEvidence(candidates: readonly MemoryEvidenceCandidate[]) {
  const grouped = new Map<string, MemoryEvidenceCandidate[]>()
  for (const candidate of candidates) {
    const bucket = grouped.get(candidate.targetSemanticTag) ?? []
    bucket.push(candidate)
    grouped.set(candidate.targetSemanticTag, bucket)
  }
  return new Map([...grouped.entries()].map(([tag, values]) => [tag, chooseEvidenceWinner(values)]))
}

function layerForAsset(asset: MemoryWorldAsset): MemoryWorldLayer {
  const kind: MemoryWorldLayer['kind'] =
    asset.assetType === 'capture' ? 'captured-reality'
    : asset.assetType === 'material' ? 'materials'
    : asset.assetType === 'vegetation' ? 'terrain-vegetation'
    : asset.assetType === 'person' ? 'people'
    : asset.assetType === 'animal' ? 'animals'
    : asset.assetType === 'event' ? 'events'
    : asset.assetType === 'audio' ? 'spatial-audio'
    : asset.assetType === 'architecture' ? 'structural-environment'
    : 'objects'
  return {
    id: `layer:${asset.assetId}`,
    kind,
    truthClass: asset.truthClass,
    sourceIds: asset.sourceIds,
    assetIds: [asset.assetId],
    representation: asset.representation,
    confidence: asset.confidence,
    visible: true,
    autobiographical: ['T0_SOURCE_CAPTURED','T1_SOURCE_DERIVED','T2_SPATIALLY_RECONSTRUCTED','T3_EVIDENCE_INFERRED'].includes(asset.truthClass),
  }
}

export function assembleMemoryWorld(input: AssemblyInput): MemoryWorld {
  const winners = resolvePersonalEvidence(input.evidence)
  const selected = new Set<string>(input.templateAssetIds)

  for (const [semanticTag, winner] of winners) {
    if (!winner?.assetId) continue
    for (const assetId of [...selected]) {
      const asset = input.assetRegistry[assetId]
      if (asset?.semanticTags.includes(semanticTag)) selected.delete(assetId)
    }
    selected.add(winner.assetId)
  }

  const assets = [...selected]
    .map((id) => input.assetRegistry[id])
    .filter((asset): asset is MemoryWorldAsset => Boolean(asset))
    .sort((a, b) => a.assetId.localeCompare(b.assetId))

  return {
    schemaVersion: 'urai-memory-world-1',
    worldId: input.worldId,
    ownerId: input.ownerId,
    archetypeId: input.archetypeId,
    label: input.label,
    capturedRealityAssetIds: assets.filter((asset) => asset.assetType === 'capture').map((asset) => asset.assetId),
    context: input.context,
    layers: assets.map(layerForAsset),
    sourceRegistry: input.sourceRegistry,
    assetRegistry: input.assetRegistry,
    provenance: {
      createdAt: input.createdAt,
      exactSourceHead: input.exactSourceHead,
      userCorrectionRevision: 0,
      assemblyVersion: MEMORY_WORLD_ASSEMBLY_VERSION,
      sourceLineageComplete: true,
    },
    governance: {
      privateByDefault: true,
      culturalReviewRequired: assets.some((asset) => asset.sensitivity?.culturalAuthorityRequired === true),
      culturalReviewState: assets.some((asset) => asset.sensitivity?.culturalAuthorityRequired === true) ? 'pending' : 'not-required',
      consentComplete: false,
      licensingComplete: false,
    },
    release: {
      state: 'draft',
      desktopVerified: false,
      mobileVerified: false,
      xrVerified: false,
    },
  }
}
