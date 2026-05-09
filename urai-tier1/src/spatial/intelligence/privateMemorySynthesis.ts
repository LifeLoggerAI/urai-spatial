import { LifeMapEmotionalWeather, LifeMapMemoryKind, LifeMapPrivacyState, SpatialAssetManifest } from '../assets/manifestTypes'

export type PrivateSignalKind = 'voice' | 'location' | 'device' | 'calendar' | 'relationship' | 'dream' | 'health' | 'ritual'

export interface PrivateMemorySignal {
  signalId: string
  kind: PrivateSignalKind
  capturedAt: string
  summary: string
  emotionalTone?: string
  intensity?: number
  confidence?: number
  personIds?: string[]
  placeId?: string
  season?: string
  privacyState?: LifeMapPrivacyState
  tags?: string[]
}

export interface PrivateMemorySynthesisInput {
  ownerId: string
  projectId?: string
  memoryId: string
  signals: PrivateMemorySignal[]
  nowIso?: string
  privacyDefault?: LifeMapPrivacyState
}

function clamp01(value: number | undefined, fallback = 0.5) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

function strongestSignal(signals: PrivateMemorySignal[]) {
  return signals.reduce<PrivateMemorySignal | null>((strongest, signal) => {
    if (!strongest) return signal
    return clamp01(signal.intensity) * clamp01(signal.confidence) > clamp01(strongest.intensity) * clamp01(strongest.confidence) ? signal : strongest
  }, null)
}

function inferMemoryKind(signals: PrivateMemorySignal[]): LifeMapMemoryKind {
  const kinds = new Set(signals.map((signal) => signal.kind))
  if (kinds.has('dream')) return 'dream'
  if (kinds.has('relationship')) return 'person'
  if (kinds.has('ritual')) return 'ritual'
  if (kinds.has('location')) return 'place'
  if (kinds.has('voice')) return 'voice'
  if (kinds.has('health')) return 'recovery'
  return 'memory'
}

function inferWeather(signals: PrivateMemorySignal[]): LifeMapEmotionalWeather {
  const text = signals.map((signal) => `${signal.summary} ${signal.emotionalTone || ''} ${(signal.tags || []).join(' ')}`).join(' ').toLowerCase()
  const intensity = signals.reduce((sum, signal) => sum + clamp01(signal.intensity), 0) / Math.max(signals.length, 1)

  if (/dream|sleep|night|symbol/.test(text)) return 'dream'
  if (/recover|repair|restore|heal|steady|calm/.test(text)) return 'recovery'
  if (/grief|loss|sad|missing/.test(text)) return 'grief'
  if (/threshold|crisis|storm|turning point|major shift/.test(text)) return 'threshold'
  if (/overstimulated|friction|stress|panic|anxious|overload/.test(text) || intensity > 0.82) return 'overstimulated'
  return 'calm'
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function buildWhyThisAppeared(signals: PrivateMemorySignal[]) {
  const kinds = Array.from(new Set(signals.map((signal) => signal.kind))).join(', ')
  const averageConfidence = signals.reduce((sum, signal) => sum + clamp01(signal.confidence), 0) / Math.max(signals.length, 1)
  return `URAI grouped ${signals.length} private signal${signals.length === 1 ? '' : 's'} (${kinds}) with ${Math.round(averageConfidence * 100)}% average confidence into one replayable memory star.`
}

export function synthesizePrivateMemoryManifest(input: PrivateMemorySynthesisInput): SpatialAssetManifest {
  const signals = input.signals.filter((signal) => signal.signalId && signal.summary)
  const primary = strongestSignal(signals)
  const weather = inferWeather(signals)
  const memoryKind = inferMemoryKind(signals)
  const averageIntensity = signals.reduce((sum, signal) => sum + clamp01(signal.intensity), 0) / Math.max(signals.length, 1)
  const averageConfidence = signals.reduce((sum, signal) => sum + clamp01(signal.confidence), 0) / Math.max(signals.length, 1)
  const titleSeed = primary?.summary || 'Private memory synthesis'
  const emotionalTone = primary?.emotionalTone || (weather === 'recovery' ? 'recovery and steadiness' : weather)
  const season = primary?.season || 'Private timeline'
  const privacyState = primary?.privacyState || input.privacyDefault || 'private'

  return {
    manifestId: `private-${input.memoryId}`,
    manifestVersion: '1.0',
    jobId: `private-synthesis-${input.memoryId}`,
    ownerId: input.ownerId,
    projectId: input.projectId || 'urai-spatial',
    assetType: `${memoryKind} memory synthesis`,
    artifacts: [],
    provider: 'firestore-private-synthesis',
    model: 'urai-private-memory-synthesis-v1',
    promptPreview: signals.map((signal) => signal.summary).join(' · ').slice(0, 240) || 'Private memory synthesis pending',
    spatialCompatibility: { supported: true, type: 'image_overlay' },
    title: titleCase(titleSeed) || 'Private Memory Star',
    systemLabel: `${memoryKind.charAt(0).toUpperCase()}${memoryKind.slice(1)} Memory`,
    emotionalTone,
    emotionalWeather: weather,
    season,
    importanceScore: clamp01(averageIntensity * 0.62 + averageConfidence * 0.38, 0.5),
    sourceType: 'private',
    privacyState,
    narratorLine: `This private ${memoryKind} star was synthesized from ${signals.length} validated signal${signals.length === 1 ? '' : 's'} without exposing raw capture data.`,
    replayReady: signals.length > 0,
    memoryKind,
    whyThisAppeared: buildWhyThisAppeared(signals),
    relationshipArcStrength: clamp01(signals.some((signal) => signal.personIds?.length) ? averageIntensity + 0.12 : averageIntensity),
    reflectionSummary: {
      changed: `The memory moved from raw ${signals.length} signal${signals.length === 1 ? '' : 's'} into a private replayable star.`,
      repeated: `The dominant pattern is ${emotionalTone}.`,
      healed: 'The map can show the pattern without showing transcripts, precise locations, or raw sensor data.',
      needsAttention: privacyState === 'private' ? 'Keep source details redacted unless the user explicitly opens provenance.' : 'Review sharing status before export.',
    },
  }
}

export function buildFirestoreMemoryWrite(manifest: SpatialAssetManifest) {
  return {
    collectionPath: 'assetManifests',
    documentId: manifest.manifestId,
    data: {
      ...manifest,
      updatedAt: new Date().toISOString(),
      synthesisVersion: 'private-memory-synthesis-v1',
      rawSignalsRedacted: true,
    },
  }
}
