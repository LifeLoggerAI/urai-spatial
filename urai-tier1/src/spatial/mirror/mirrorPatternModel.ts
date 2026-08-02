import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'

export type MirrorPatternKind =
  | 'body-rhythm'
  | 'relationship-weather'
  | 'emotional-recurrence'
  | 'becoming'

export type MirrorEvidenceState =
  | 'strong'
  | 'emerging'
  | 'conflicting'
  | 'insufficient'
  | 'unavailable'

export type MirrorSource = {
  id: string
  label: string
  kind: 'memory' | 'person' | 'place' | 'media' | 'replay-segment' | 'emotion'
  permission: 'owner' | 'demo'
}

export type MirrorFragment = {
  id: string
  label: string
  position: [number, number, number]
  sourceId: string
  certainty: 'confirmed' | 'inferred' | 'uncertain'
}

export type MirrorPattern = {
  id: MirrorPatternKind
  label: string
  shortLabel: string
  summary: string
  explanation: string
  evidenceState: MirrorEvidenceState
  confidence: number | null
  confidenceLabel: string
  evidenceCount: number
  uncertainty: string
  provenance: string
  timeRange: { start: string; end: string }
  sources: MirrorSource[]
  fragments: MirrorFragment[]
  accent: string
  position: [number, number, number]
}

const POSITIONS: Record<MirrorPatternKind, [number, number, number]> = {
  'body-rhythm': [-3.1, 1.2, -3.2],
  'relationship-weather': [3.2, 1.4, -3.7],
  'emotional-recurrence': [-2.4, 2.5, -5.1],
  becoming: [2.5, 2.35, -5.4],
}

function clampConfidence(value: number) {
  return Math.max(0.05, Math.min(0.92, value))
}

function confidenceLabel(confidence: number | null) {
  if (confidence === null) return 'Insufficient evidence'
  if (confidence >= 0.72) return 'Recurring evidence'
  if (confidence >= 0.46) return 'Emerging evidence'
  return 'Limited evidence'
}

function evidenceState(confidence: number | null, conflicting = false): MirrorEvidenceState {
  if (conflicting) return 'conflicting'
  if (confidence === null) return 'insufficient'
  if (confidence >= 0.72) return 'strong'
  if (confidence >= 0.35) return 'emerging'
  return 'insufficient'
}

function permission(memory: SelectedMemory): MirrorSource['permission'] {
  return memory.demo ? 'demo' : 'owner'
}

function timeRange(memory: SelectedMemory) {
  const endMs = Date.parse(memory.occurredAt)
  const durationMs = memory.replayManifest.durationMs
  if (!Number.isFinite(endMs) || !Number.isSafeInteger(durationMs) || durationMs <= 0) {
    return { start: memory.occurredAt, end: memory.occurredAt }
  }
  const startMs = endMs - durationMs
  if (!Number.isFinite(startMs) || startMs < -8640000000000000 || startMs > 8640000000000000) {
    return { start: memory.occurredAt, end: memory.occurredAt }
  }
  return { start: new Date(startMs).toISOString(), end: memory.occurredAt }
}

function source(memory: SelectedMemory, id: string, label: string, kind: MirrorSource['kind']): MirrorSource {
  return { id, label, kind, permission: permission(memory) }
}

function memoryFragment(memory: SelectedMemory, id: string, label: string, position: [number, number, number], sourceId: string, certainty: MirrorFragment['certainty']): MirrorFragment {
  return { id: `${memory.id}:${id}`, label, position, sourceId, certainty }
}

export function buildMirrorPatterns(memory: SelectedMemory): MirrorPattern[] {
  const range = timeRange(memory)
  const privacyLabel = memory.demo ? 'disclosed deterministic demonstration data' : 'owner-authorized private memory data'
  const baseSource = source(memory, `memory:${memory.id}`, 'Selected memory', 'memory')

  const bodyEvidence = [
    memory.emotionalState ? 1 : 0,
    memory.emotionalArc.length ? 1 : 0,
    memory.sourceMedia.some((item) => item.kind === 'audio') ? 1 : 0,
    memory.replayManifest.segments.some((segment) => segment.id === 'emotion') ? 1 : 0,
  ].reduce((total, item) => total + item, 0)
  const bodyConfidence = bodyEvidence >= 2 ? clampConfidence(0.34 + bodyEvidence * 0.12) : null
  const bodySources: MirrorSource[] = [baseSource]
  if (memory.emotionalState) bodySources.push(source(memory, `emotion:${memory.id}`, 'Recorded emotional state', 'emotion'))
  if (memory.sourceMedia.some((item) => item.kind === 'audio')) bodySources.push(source(memory, `audio:${memory.id}`, 'Authorized audio source present', 'media'))

  const relationshipEvidence = memory.people.length
  const relationshipConfidence = relationshipEvidence
    ? clampConfidence(0.35 + Math.min(relationshipEvidence, 4) * 0.12)
    : null
  const relationshipSources: MirrorSource[] = [baseSource, ...memory.people.map((person) => source(memory, `person:${person.id}`, 'Authorized person reference', 'person'))]

  const emotionEvidence = memory.emotionalArc.length + (memory.emotionalState ? 1 : 0)
  // Emotional label diversity is not an explicit contradiction signal. Until the
  // source contract carries typed contradiction evidence, normal memories remain
  // non-conflicting and only the bounded acceptance fixture can exercise that UI.
  const emotionConflicting = false
  const emotionConfidence = emotionEvidence >= 2 ? clampConfidence(0.32 + Math.min(emotionEvidence, 5) * 0.1) : null
  const emotionSources: MirrorSource[] = [baseSource]
  if (memory.emotionalState) emotionSources.push(source(memory, `emotion:${memory.id}`, 'Recorded emotional state', 'emotion'))
  memory.replayManifest.segments
    .filter((segment) => segment.id === 'emotion' || segment.id === 'pattern')
    .forEach((segment) => emotionSources.push(source(memory, `segment:${segment.id}`, `Replay ${segment.label} segment`, 'replay-segment')))

  const becomingEvidence = memory.replayManifest.segments.filter((segment) => segment.id === 'pattern' || segment.id === 'return').length
    + (memory.emotionalArc.length >= 2 ? 1 : 0)
  const becomingConfidence = becomingEvidence >= 2 ? clampConfidence(0.38 + becomingEvidence * 0.11) : null
  const becomingSources: MirrorSource[] = [
    baseSource,
    ...memory.replayManifest.segments
      .filter((segment) => segment.id === 'pattern' || segment.id === 'return')
      .map((segment) => source(memory, `segment:${segment.id}`, `Replay ${segment.label} segment`, 'replay-segment')),
  ]

  return [
    {
      id: 'body-rhythm',
      label: 'Body rhythm',
      shortLabel: 'Rhythm',
      summary: bodyConfidence === null
        ? 'There is not enough permitted embodied evidence to describe a recurring rhythm.'
        : 'Available signals suggest a rhythm around how this memory was felt and revisited.',
      explanation: 'This reflection uses only permitted emotional, replay, and optional audio presence. It is not a health reading or diagnosis.',
      evidenceState: evidenceState(bodyConfidence),
      confidence: bodyConfidence,
      confidenceLabel: confidenceLabel(bodyConfidence),
      evidenceCount: bodyEvidence,
      uncertainty: bodyConfidence === null ? 'More permitted observations are required.' : 'A single memory cannot establish a stable body pattern.',
      provenance: privacyLabel,
      timeRange: range,
      sources: bodySources,
      fragments: [
        memoryFragment(memory, 'body-emotion', 'Emotional state', [-0.8, 1.25, -4.4], `emotion:${memory.id}`, memory.emotionalState ? 'confirmed' : 'uncertain'),
        memoryFragment(memory, 'body-return', 'Return phase', [0.9, 1.05, -4.8], 'segment:return', memory.replayManifest.segments.some((segment) => segment.id === 'return') ? 'confirmed' : 'uncertain'),
      ],
      accent: '#8feaf1',
      position: POSITIONS['body-rhythm'],
    },
    {
      id: 'relationship-weather',
      label: 'Relationship weather',
      shortLabel: 'Relationships',
      summary: relationshipConfidence === null
        ? 'No authorized relationship evidence is available for this reflection.'
        : 'Authorized person references can be inspected as proximity and influence without judging anyone.',
      explanation: 'Depth and proximity represent evidence availability in this memory, not whether a person is good, bad, safe, or unsafe.',
      evidenceState: evidenceState(relationshipConfidence),
      confidence: relationshipConfidence,
      confidenceLabel: confidenceLabel(relationshipConfidence),
      evidenceCount: relationshipEvidence,
      uncertainty: relationshipConfidence === null ? 'No permitted person reference is present.' : 'This view does not infer another person’s private thoughts or intent.',
      provenance: privacyLabel,
      timeRange: range,
      sources: relationshipSources,
      fragments: memory.people.slice(0, 5).map((person, index) => memoryFragment(
        memory,
        `relationship-${person.id}`,
        memory.demo ? `Example relationship ${index + 1}` : person.label,
        [Math.cos(index * 1.7) * (1.2 + index * 0.22), 0.8 + (index % 2) * 0.45, -4.8 - Math.sin(index * 0.9)],
        `person:${person.id}`,
        'confirmed',
      )),
      accent: '#d6bdff',
      position: POSITIONS['relationship-weather'],
    },
    {
      id: 'emotional-recurrence',
      label: 'Emotional recurrence',
      shortLabel: 'Recurrence',
      summary: emotionConfidence === null
        ? 'There is not enough evidence to describe an emotional recurrence.'
        : emotionConflicting
          ? 'The available emotional evidence moves in more than one direction and remains intentionally unresolved.'
          : 'The selected memory contains an emotional sequence that can be inspected without turning it into a score.',
      explanation: 'The chamber shows recorded labels and replay structure. It does not claim a permanent trait, diagnosis, or prediction.',
      evidenceState: evidenceState(emotionConfidence, emotionConflicting),
      confidence: emotionConfidence,
      confidenceLabel: emotionConflicting ? 'Conflicting evidence' : confidenceLabel(emotionConfidence),
      evidenceCount: emotionEvidence,
      uncertainty: emotionConflicting ? 'Multiple emotional directions are visible.' : 'This reflection is limited to the selected memory.',
      provenance: privacyLabel,
      timeRange: range,
      sources: emotionSources,
      fragments: memory.emotionalArc.slice(0, 6).map((entry, index) => memoryFragment(
        memory,
        `emotion-${index}`,
        entry,
        [Math.sin(index * 1.3) * 1.6, 0.75 + index * 0.18, -4.2 - index * 0.42],
        `emotion:${memory.id}`,
        index === 0 ? 'confirmed' : 'inferred',
      )),
      accent: '#8fc8ff',
      position: POSITIONS['emotional-recurrence'],
    },
    {
      id: 'becoming',
      label: 'Becoming over time',
      shortLabel: 'Becoming',
      summary: becomingConfidence === null
        ? 'There is not enough permitted temporal evidence to show directional change.'
        : 'Replay phases can be viewed as a sequence of memory, recognition, pattern, and return—without assigning a progress score.',
      explanation: 'This reflection preserves contradiction and uncertainty. It describes movement within the selected replay, not who you permanently are.',
      evidenceState: evidenceState(becomingConfidence),
      confidence: becomingConfidence,
      confidenceLabel: confidenceLabel(becomingConfidence),
      evidenceCount: becomingEvidence,
      uncertainty: becomingConfidence === null ? 'A broader authorized time range is required.' : 'One replay cannot establish a complete life direction.',
      provenance: privacyLabel,
      timeRange: range,
      sources: becomingSources,
      fragments: memory.replayManifest.segments.map((segment, index) => memoryFragment(
        memory,
        `becoming-${segment.id}`,
        segment.label,
        [-1.8 + index * 1.2, 0.72 + index * 0.3, -4.4 - index * 0.7],
        `segment:${segment.id}`,
        segment.id === 'pattern' ? 'inferred' : 'confirmed',
      )),
      accent: '#f0d79e',
      position: POSITIONS.becoming,
    },
  ]
}

export function applyMirrorFixture(patterns: MirrorPattern[], fixture: string | null) {
  if (!fixture) return patterns
  if (fixture === 'empty' || fixture === 'permission-denied' || fixture === 'failed') return []
  if (fixture === 'partial') {
    return patterns.map((pattern, index) => index === 0
      ? { ...pattern, confidence: 0.28, confidenceLabel: 'Limited evidence', evidenceState: 'emerging' as const, uncertainty: 'Only one permitted source is currently available.' }
      : { ...pattern, confidence: null, confidenceLabel: 'Insufficient evidence', evidenceState: 'insufficient' as const, evidenceCount: 0, fragments: [] })
  }
  if (fixture === 'conflicting') {
    return patterns.map((pattern, index) => index === 2
      ? { ...pattern, evidenceState: 'conflicting' as const, confidenceLabel: 'Conflicting evidence', uncertainty: 'The permitted sources point in different directions.' }
      : pattern)
  }
  return patterns
}
