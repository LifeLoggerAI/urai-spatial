export type SelectedMemoryStatus =
  | 'loading'
  | 'ready'
  | 'demo'
  | 'unavailable'
  | 'deleted'
  | 'unauthorized'
  | 'corrupt'

export type SelectedMemoryPrivacy = 'private' | 'hidden' | 'shareable'

export type SelectedMemoryPerson = {
  id: string
  label: string
  relationship?: string
}

export type SelectedMemoryPlace = {
  label: string
  region?: string
  latitude?: number
  longitude?: number
}

export type SelectedMemoryMedia = {
  kind: 'image' | 'video' | 'audio'
  url: string
  caption?: string
}

export type SelectedMemoryReplaySegment = {
  id: 'memory' | 'emotion' | 'pattern' | 'return'
  label: string
  caption: string
  narratorLine: string
  startsAtMs: number
  durationMs: number
}

export type SelectedMemoryReplayManifest = {
  id: string
  version: number
  durationMs: number
  segments: SelectedMemoryReplaySegment[]
  transcript?: string
  audioUrl?: string
}

export type SelectedMemoryStar = {
  id: string
  position: [number, number, number]
  scale: number
  aura: string
  material: 'glass' | 'ember' | 'mist' | 'crystal'
}

export type SelectedMemoryVisuals = {
  sky: string
  ground: string
  fog: number
  particles: number
  reflection: number
  light: string
  accent: string
}

export type SelectedMemory = {
  id: string
  ownerId: string
  authorization: 'owner'
  title: string
  occurredAt: string
  summary: string
  people: SelectedMemoryPerson[]
  place?: SelectedMemoryPlace
  emotionalState: string
  emotionalArc: string[]
  sourceMedia: SelectedMemoryMedia[]
  privacy: SelectedMemoryPrivacy
  replayManifest: SelectedMemoryReplayManifest
  narrator: {
    focus: string
    replay: string
  }
  star: SelectedMemoryStar
  visuals: SelectedMemoryVisuals
  deleted: false
  demo: boolean
}

export type SelectedMemoryResult =
  | { status: 'loading'; memory: null; message: string }
  | { status: 'ready' | 'demo'; memory: SelectedMemory; message: string }
  | { status: 'unavailable' | 'deleted' | 'unauthorized' | 'corrupt'; memory: null; message: string }

const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,120}$/
const CANONICAL_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const CANONICAL_REPLAY_PHASES = ['memory', 'emotion', 'pattern', 'return'] as const
const MAX_REPLAY_DURATION_MS = 7 * 24 * 60 * 60 * 1000

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isoDateValue(value: unknown) {
  if (typeof value !== 'string' || !value || value.trim() !== value) return null
  if (!CANONICAL_UTC_TIMESTAMP.test(value)) return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  const canonical = new Date(timestamp).toISOString()
  return canonical === value ? canonical : null
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function tuple3(value: unknown): [number, number, number] | null {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
    ? value as [number, number, number]
    : null
}

export function sanitizeMemoryId(value: string | null | undefined) {
  return value && SAFE_TOKEN.test(value) ? value : null
}

export function isExplicitDemoRequest(params: URLSearchParams) {
  return params.get('demo') === '1' && params.get('memoryId')?.startsWith('demo:') === true
}

export function buildExplicitDemoMemory(id: string): SelectedMemory {
  return {
    id,
    ownerId: 'explicit-demo',
    authorization: 'owner',
    title: 'Demonstration Memory',
    occurredAt: '2026-01-01T12:00:00.000Z',
    summary: 'A clearly disclosed demonstration fixture. This is not personal data.',
    people: [{ id: 'demo-person', label: 'Example person', relationship: 'demonstration only' }],
    place: { label: 'Example place' },
    emotionalState: 'calm',
    emotionalArc: ['arrival', 'recognition', 'return'],
    sourceMedia: [],
    privacy: 'private',
    replayManifest: {
      id: 'demo-manifest',
      version: 1,
      durationMs: 10000,
      transcript: 'Demonstration replay. No personal memory is being shown.',
      segments: [
        { id: 'memory', label: 'Memory', caption: 'The example scene opens.', narratorLine: 'This is an explicit demonstration.', startsAtMs: 0, durationMs: 2400 },
        { id: 'emotion', label: 'Emotion', caption: 'The example feeling becomes visible.', narratorLine: 'No personal inference is being made.', startsAtMs: 2400, durationMs: 2600 },
        { id: 'pattern', label: 'Pattern', caption: 'An example pattern appears.', narratorLine: 'This pattern exists only in the fixture.', startsAtMs: 5000, durationMs: 2800 },
        { id: 'return', label: 'Return', caption: 'The demonstration settles.', narratorLine: 'Return to the disclosed demo Focus state.', startsAtMs: 7800, durationMs: 2200 },
      ],
    },
    narrator: { focus: 'Explicit demo mode is active.', replay: 'This replay contains demonstration content only.' },
    star: { id, position: [0, 0, -4], scale: 1, aura: '#8adfff', material: 'glass' },
    visuals: { sky: '#061526', ground: '#132b2b', fog: 0.35, particles: 0.5, reflection: 0.45, light: '#dffbff', accent: '#8adfff' },
    deleted: false,
    demo: true,
  }
}

export function parseSelectedMemory(raw: Record<string, unknown>, expectedOwnerId: string, id: string): SelectedMemoryResult {
  if (raw.deleted === true) return { status: 'deleted', memory: null, message: 'This memory was deleted.' }
  const ownerId = stringValue(raw.ownerId ?? raw.userId)
  if (!ownerId || ownerId !== expectedOwnerId) return { status: 'unauthorized', memory: null, message: 'This memory is not available to this account.' }

  const title = stringValue(raw.title)
  const occurredAt = isoDateValue(raw.occurredAt)
  const summary = stringValue(raw.summary)
  const emotionalState = stringValue(raw.emotionalState ?? raw.emotion)
  const replay = raw.replayManifest && typeof raw.replayManifest === 'object' ? raw.replayManifest as Record<string, unknown> : null
  const replayId = replay ? stringValue(replay.id ?? replay.manifestId) : null
  const replaySegments = replay && Array.isArray(replay.segments) ? replay.segments : null
  const position = tuple3((raw.star as Record<string, unknown> | undefined)?.position ?? raw.position)

  if (!title || !occurredAt || !summary || !emotionalState || !replayId || !replaySegments || !position) {
    return { status: 'corrupt', memory: null, message: 'This memory is incomplete and cannot be opened safely.' }
  }

  const segments: SelectedMemoryReplaySegment[] = replaySegments.flatMap((item): SelectedMemoryReplaySegment[] => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const segmentId = value.id
    if (segmentId !== 'memory' && segmentId !== 'emotion' && segmentId !== 'pattern' && segmentId !== 'return') return []
    const label = stringValue(value.label)
    const caption = stringValue(value.caption)
    const narratorLine = stringValue(value.narratorLine)
    const startsAtMs = numberValue(value.startsAtMs, -1)
    const durationMs = numberValue(value.durationMs, -1)
    if (!label || !caption || !narratorLine) return []
    if (!Number.isSafeInteger(startsAtMs) || startsAtMs < 0) return []
    if (!Number.isSafeInteger(durationMs) || durationMs <= 0) return []
    return [{ id: segmentId, label, caption, narratorLine, startsAtMs, durationMs }]
  })
  const replayPhaseIds = new Set(segments.map(({ id: phaseId }) => phaseId))
  const chronologicalSegments = [...segments].sort((left, right) => left.startsAtMs - right.startsAtMs)
  const chronologicalPhaseIds = chronologicalSegments.map(({ id: phaseId }) => phaseId)
  const hasCanonicalChronology = CANONICAL_REPLAY_PHASES.every((phase, index) => chronologicalPhaseIds[index] === phase)
  const hasNonOverlappingChronology = chronologicalSegments.every((segment, index) => {
    if (index === 0) return segment.startsAtMs === 0
    const previous = chronologicalSegments[index - 1]
    return segment.startsAtMs >= previous.startsAtMs + previous.durationMs
  })
  const segmentDurationMs = chronologicalSegments.reduce((total, segment) => total + segment.durationMs, 0)
  const finalSegment = chronologicalSegments.at(-1)
  const finalSegmentEndMs = finalSegment ? finalSegment.startsAtMs + finalSegment.durationMs : -1
  if (
    segments.length !== CANONICAL_REPLAY_PHASES.length
    || replayPhaseIds.size !== CANONICAL_REPLAY_PHASES.length
    || CANONICAL_REPLAY_PHASES.some((phase) => !replayPhaseIds.has(phase))
    || !hasCanonicalChronology
    || !hasNonOverlappingChronology
    || !Number.isSafeInteger(segmentDurationMs)
    || segmentDurationMs <= 0
    || segmentDurationMs > MAX_REPLAY_DURATION_MS
    || !Number.isSafeInteger(finalSegmentEndMs)
    || finalSegmentEndMs <= 0
    || finalSegmentEndMs > MAX_REPLAY_DURATION_MS
  ) {
    return { status: 'corrupt', memory: null, message: 'The replay manifest is incomplete.' }
  }

  const requestedDurationMs = replay?.durationMs
  const replayDurationMs = typeof requestedDurationMs === 'number'
    && Number.isSafeInteger(requestedDurationMs)
    && requestedDurationMs >= finalSegmentEndMs
    && requestedDurationMs <= MAX_REPLAY_DURATION_MS
    ? requestedDurationMs
    : finalSegmentEndMs

  const people = Array.isArray(raw.people) ? raw.people.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const personId = stringValue(value.id)
    const label = stringValue(value.label)
    return personId && label ? [{ id: personId, label, relationship: stringValue(value.relationship) ?? undefined }] : []
  }) : []
  const personIds = new Set(people.map(({ id: personId }) => personId))
  if (personIds.size !== people.length) {
    return { status: 'corrupt', memory: null, message: 'This memory contains duplicate person references.' }
  }

  const placeRaw = raw.place && typeof raw.place === 'object' ? raw.place as Record<string, unknown> : null
  const placeLabel = placeRaw ? stringValue(placeRaw.label) : null
  const privacy = raw.privacy === 'hidden' || raw.privacy === 'shareable' ? raw.privacy : 'private'
  const starRaw = raw.star && typeof raw.star === 'object' ? raw.star as Record<string, unknown> : {}
  const visualsRaw = raw.visuals && typeof raw.visuals === 'object' ? raw.visuals as Record<string, unknown> : {}

  return {
    status: 'ready',
    message: 'Memory ready.',
    memory: {
      id,
      ownerId,
      authorization: 'owner',
      title,
      occurredAt,
      summary,
      people,
      place: placeLabel ? { label: placeLabel, region: stringValue(placeRaw?.region) ?? undefined } : undefined,
      emotionalState,
      emotionalArc: stringArray(raw.emotionalArc),
      sourceMedia: Array.isArray(raw.sourceMedia) ? raw.sourceMedia.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const value = item as Record<string, unknown>
        const kind = value.kind
        const url = stringValue(value.url)
        return url && (kind === 'image' || kind === 'video' || kind === 'audio') ? [{ kind, url, caption: stringValue(value.caption) ?? undefined }] : []
      }) : [],
      privacy,
      replayManifest: {
        id: replayId,
        version: numberValue(replay?.version, 1),
        durationMs: replayDurationMs,
        segments: chronologicalSegments,
        transcript: stringValue(replay?.transcript) ?? undefined,
        audioUrl: stringValue(replay?.audioUrl) ?? undefined,
      },
      narrator: {
        focus: stringValue((raw.narrator as Record<string, unknown> | undefined)?.focus) ?? summary,
        replay: stringValue((raw.narrator as Record<string, unknown> | undefined)?.replay) ?? summary,
      },
      star: {
        id: stringValue(starRaw.id) ?? id,
        position,
        scale: numberValue(starRaw.scale, 1),
        aura: stringValue(starRaw.aura ?? raw.aura) ?? '#8adfff',
        material: starRaw.material === 'ember' || starRaw.material === 'mist' || starRaw.material === 'crystal' ? starRaw.material : 'glass',
      },
      visuals: {
        sky: stringValue(visualsRaw.sky) ?? '#061526',
        ground: stringValue(visualsRaw.ground) ?? '#132b2b',
        fog: numberValue(visualsRaw.fog, 0.35),
        particles: numberValue(visualsRaw.particles, 0.5),
        reflection: numberValue(visualsRaw.reflection, 0.45),
        light: stringValue(visualsRaw.light) ?? '#dffbff',
        accent: stringValue(visualsRaw.accent) ?? '#8adfff',
      },
      deleted: false,
      demo: false,
    },
  }
}
