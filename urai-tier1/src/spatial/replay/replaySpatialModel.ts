import type {
  SelectedMemory,
  SelectedMemoryReplaySegment,
} from '@/spatial/memory/selectedMemoryContract'

export type ReplayEvidenceLevel =
  | 'confirmed'
  | 'high-confidence'
  | 'inferred'
  | 'unknown'
  | 'user-corrected'
  | 'disputed'

export type ReplayTruthMode =
  | 'evidence'
  | 'reflection'
  | 'cinematic'
  | 'private-journal'

export type ReplayConsentState = 'allowed' | 'abstract-only' | 'blocked'
export type ReplayAnchorKind = 'person' | 'place' | 'object' | 'sound' | 'event' | 'emotion' | 'pattern'
export type ReplayAnchorInteraction = 'inspect' | 'listen' | 'follow' | 'correct' | 'none'

export type ReplayWorldAnchor = {
  id: string
  kind: ReplayAnchorKind
  label: string
  description: string
  position: [number, number, number]
  evidenceLevel: ReplayEvidenceLevel
  sourceIds: string[]
  consentState: ReplayConsentState
  interaction: ReplayAnchorInteraction
  segmentId?: SelectedMemoryReplaySegment['id']
  mediaUrl?: string
}

export type ReplaySensitiveTopic = {
  id: string
  label: string
  reason: string
}

export type ReplaySpatialSceneModel = {
  memoryId: string
  title: string
  placeLabel: string
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  spawn: [number, number, number]
  guidedCamera: Record<SelectedMemoryReplaySegment['id'], {
    position: [number, number, number]
    target: [number, number, number]
  }>
  anchors: ReplayWorldAnchor[]
  sensitiveTopics: ReplaySensitiveTopic[]
  preflightDisclosures: string[]
}

const GUIDED_CAMERA: ReplaySpatialSceneModel['guidedCamera'] = {
  memory: { position: [0, 1.7, 7.2], target: [0, 1.15, -1.4] },
  emotion: { position: [-2.9, 1.8, 3.2], target: [-1.4, 1.05, -2.6] },
  pattern: { position: [3.4, 2.0, 1.2], target: [1.4, 1.1, -4.8] },
  return: { position: [0, 1.8, 6.2], target: [0, 1.2, -1.1] },
}

const SENSITIVE_TERMS: Array<{ id: string; label: string; terms: string[] }> = [
  { id: 'grief', label: 'grief or loss', terms: ['grief', 'loss', 'funeral', 'died', 'death', 'deceased'] },
  { id: 'conflict', label: 'conflict or breakup', terms: ['breakup', 'argument', 'conflict', 'fight', 'divorce'] },
  { id: 'health', label: 'health-related material', terms: ['hospital', 'health', 'illness', 'diagnosis', 'injury'] },
  { id: 'children', label: 'children or family', terms: ['child', 'children', 'kid', 'daughter', 'son'] },
  { id: 'location', label: 'location details', terms: ['address', 'home', 'location', 'coordinates'] },
]

function personPosition(index: number, total: number): [number, number, number] {
  const safeTotal = Math.max(1, total)
  const angle = -Math.PI * 0.75 + (index / safeTotal) * Math.PI * 1.5
  const radius = 3.8 + (index % 2) * 0.7
  return [Math.cos(angle) * radius, 0, -2.8 + Math.sin(angle) * radius * 0.55]
}

function detectSensitiveTopics(memory: SelectedMemory): ReplaySensitiveTopic[] {
  const searchable = [
    memory.title,
    memory.summary,
    memory.emotionalState,
    ...memory.emotionalArc,
    ...memory.people.map((person) => `${person.label} ${person.relationship ?? ''}`),
    memory.place?.label ?? '',
    memory.place?.region ?? '',
    ...memory.sourceMedia.map((media) => media.caption ?? ''),
    memory.replayManifest.transcript ?? '',
  ].join(' ').toLowerCase()

  const topics = SENSITIVE_TERMS.filter((topic) => topic.terms.some((term) => searchable.includes(term))).map((topic) => ({
    id: topic.id,
    label: topic.label,
    reason: 'Possible sensitive material detected from user-approved Replay text. Review before playback.',
  }))

  if (memory.people.length > 0 && !topics.some((topic) => topic.id === 'people')) {
    topics.push({
      id: 'people',
      label: 'other people appear in this memory',
      reason: 'People remain abstract unless a future consent record explicitly permits likeness or voice use.',
    })
  }

  return topics
}

export function filterReplayAnchorsForTruthMode(anchors: ReplayWorldAnchor[], mode: ReplayTruthMode) {
  if (mode === 'evidence') {
    return anchors.filter((anchor) => anchor.evidenceLevel === 'confirmed' || anchor.evidenceLevel === 'high-confidence' || anchor.evidenceLevel === 'user-corrected')
  }
  if (mode === 'reflection') return anchors.filter((anchor) => anchor.evidenceLevel !== 'unknown')
  return anchors
}

export function replayTruthModeDescription(mode: ReplayTruthMode) {
  if (mode === 'evidence') return 'Verified source-backed details only. Inferred and unknown elements stay hidden.'
  if (mode === 'reflection') return 'Confirmed details plus clearly labeled interpretation. Unknown elements stay hidden.'
  if (mode === 'private-journal') return 'Private reflection mode. This view is not shareable by default.'
  return 'Cinematic presentation with inferred, disputed, and unknown elements visibly labeled.'
}

export function buildReplaySpatialScene(memory: SelectedMemory): ReplaySpatialSceneModel {
  const anchors: ReplayWorldAnchor[] = []

  if (memory.place) {
    anchors.push({
      id: `${memory.id}:place`,
      kind: 'place',
      label: memory.place.label,
      description: memory.place.region ? `${memory.place.label}, ${memory.place.region}` : memory.place.label,
      position: [0, 0, -6.2],
      evidenceLevel: 'confirmed',
      sourceIds: [`memory:${memory.id}:place`],
      consentState: 'allowed',
      interaction: 'inspect',
      segmentId: 'memory',
    })
  }

  memory.people.forEach((person, index) => {
    anchors.push({
      id: `${memory.id}:person:${person.id}`,
      kind: 'person',
      label: person.label,
      description: person.relationship ? `${person.label} · ${person.relationship}` : person.label,
      position: personPosition(index, memory.people.length),
      evidenceLevel: 'confirmed',
      sourceIds: [`memory:${memory.id}:person:${person.id}`],
      // Current memory records do not contain likeness or voice consent. Keep people abstract.
      consentState: 'abstract-only',
      interaction: 'inspect',
      segmentId: 'memory',
    })
  })

  memory.sourceMedia.forEach((media, index) => {
    const side = index % 2 === 0 ? -1 : 1
    const depth = -1.2 - Math.floor(index / 2) * 2.1
    anchors.push({
      id: `${memory.id}:media:${index}`,
      kind: media.kind === 'audio' ? 'sound' : 'object',
      label: media.caption ?? `${media.kind} source ${index + 1}`,
      description: media.caption ?? `Confirmed ${media.kind} source attached to this memory.`,
      position: [side * (2.4 + (index % 3) * 0.55), media.kind === 'audio' ? 1.25 : 1.05, depth],
      evidenceLevel: 'confirmed',
      sourceIds: [`memory:${memory.id}:source-media:${index}`],
      consentState: 'allowed',
      interaction: media.kind === 'audio' ? 'listen' : 'inspect',
      segmentId: 'memory',
      mediaUrl: media.url,
    })
  })

  anchors.push(
    {
      id: `${memory.id}:emotion`,
      kind: 'emotion',
      label: memory.emotionalState,
      description: 'A clearly labeled interpretation of the emotional signal attached to this memory.',
      position: [-1.7, 1.15, -3.3],
      evidenceLevel: 'inferred',
      sourceIds: [`memory:${memory.id}:emotional-state`],
      consentState: 'allowed',
      interaction: 'correct',
      segmentId: 'emotion',
    },
    {
      id: `${memory.id}:pattern`,
      kind: 'pattern',
      label: memory.emotionalArc.length ? memory.emotionalArc.join(' → ') : 'No confirmed pattern',
      description: memory.emotionalArc.length
        ? 'A possible sequence inferred from the memory record. It is not presented as fact.'
        : 'URAI does not have enough evidence to construct a pattern for this memory.',
      position: [1.9, 1.2, -5.0],
      evidenceLevel: memory.emotionalArc.length ? 'inferred' : 'unknown',
      sourceIds: memory.emotionalArc.length ? [`memory:${memory.id}:emotional-arc`] : [],
      consentState: 'allowed',
      interaction: memory.emotionalArc.length ? 'correct' : 'none',
      segmentId: 'pattern',
    },
  )

  const sensitiveTopics = detectSensitiveTopics(memory)
  return {
    memoryId: memory.id,
    title: memory.title,
    placeLabel: memory.place?.label ?? 'Partially reconstructed memory space',
    bounds: { minX: -8, maxX: 8, minZ: -9, maxZ: 7.5 },
    spawn: [0, 0, 7.2],
    guidedCamera: GUIDED_CAMERA,
    anchors: anchors.filter((anchor) => anchor.consentState !== 'blocked'),
    sensitiveTopics,
    preflightDisclosures: [
      'Replay never autoplays. You choose when to enter and may exit immediately.',
      'Confirmed, inferred, disputed, and unknown details remain visibly separated.',
      'People remain abstract unless a future consent record explicitly permits likeness or voice use.',
      ...sensitiveTopics.map((topic) => topic.reason),
    ],
  }
}

export function replayEvidenceDescription(level: ReplayEvidenceLevel) {
  if (level === 'confirmed') return 'Confirmed from an approved source.'
  if (level === 'high-confidence') return 'Strongly supported, but not fully confirmed.'
  if (level === 'user-corrected') return 'Corrected by the memory owner.'
  if (level === 'disputed') return 'Sources conflict. URAI has not chosen a version.'
  if (level === 'unknown') return 'Not enough evidence is available.'
  return 'Inferred by URAI and clearly separated from confirmed facts.'
}
