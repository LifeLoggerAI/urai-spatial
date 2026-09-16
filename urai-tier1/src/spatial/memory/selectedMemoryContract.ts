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

export type ReplayEvidenceClass =
  | 'CAPTURED'
  | 'DERIVED'
  | 'SUPPORTED_RECONSTRUCTION'
  | 'SYMBOLIC'
  | 'UNKNOWN'

export type ReplayEvidenceSourceKind =
  | 'photo'
  | 'video'
  | 'audio'
  | 'journal'
  | 'calendar'
  | 'location'
  | 'sensor'
  | 'user-statement'
  | 'generated'

export type ReplayEvidence = {
  id: string
  class: ReplayEvidenceClass
  sourceKind: ReplayEvidenceSourceKind
  sourceId?: string
  occurredAt?: string
  derivedFrom: string[]
  userConfirmed: boolean
  presentationAllowed: boolean
  confidence?: number
  provenance?: Record<string, string>
}

export type ReplaySegmentKind =
  | 'captured-event'
  | 'gap'
  | 'derived-context'
  | 'reflection'
  | 'symbolic-bridge'

export type LegacyReplayPhase = 'memory' | 'emotion' | 'pattern' | 'return'

export type SelectedMemoryReplaySegment = {
  id: string
  kind: ReplaySegmentKind
  evidenceClass: ReplayEvidenceClass
  evidenceIds: string[]
  legacyPhase?: LegacyReplayPhase
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
  evidence: ReplayEvidence[]
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
const MAX_REPLAY_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const EVIDENCE_CLASSES = new Set<ReplayEvidenceClass>(['CAPTURED', 'DERIVED', 'SUPPORTED_RECONSTRUCTION', 'SYMBOLIC', 'UNKNOWN'])
const EVIDENCE_SOURCE_KINDS = new Set<ReplayEvidenceSourceKind>(['photo', 'video', 'audio', 'journal', 'calendar', 'location', 'sensor', 'user-statement', 'generated'])
const SEGMENT_KINDS = new Set<ReplaySegmentKind>(['captured-event', 'gap', 'derived-context', 'reflection', 'symbolic-bridge'])
const LEGACY_PHASES = new Set<LegacyReplayPhase>(['memory', 'emotion', 'pattern', 'return'])
const LEGACY_KIND: Record<LegacyReplayPhase, ReplaySegmentKind> = {
  memory: 'captured-event',
  emotion: 'reflection',
  pattern: 'derived-context',
  return: 'reflection',
}

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

function evidenceClassValue(value: unknown): ReplayEvidenceClass | null {
  return typeof value === 'string' && EVIDENCE_CLASSES.has(value as ReplayEvidenceClass) ? value as ReplayEvidenceClass : null
}

function evidenceSourceKindValue(value: unknown): ReplayEvidenceSourceKind | null {
  return typeof value === 'string' && EVIDENCE_SOURCE_KINDS.has(value as ReplayEvidenceSourceKind) ? value as ReplayEvidenceSourceKind : null
}

function segmentKindValue(value: unknown): ReplaySegmentKind | null {
  return typeof value === 'string' && SEGMENT_KINDS.has(value as ReplaySegmentKind) ? value as ReplaySegmentKind : null
}

function legacyPhaseValue(value: unknown): LegacyReplayPhase | null {
  return typeof value === 'string' && LEGACY_PHASES.has(value as LegacyReplayPhase) ? value as LegacyReplayPhase : null
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  return entries.length ? Object.fromEntries(entries) : undefined
}

function parseSourceMedia(raw: unknown): SelectedMemoryMedia[] {
  return Array.isArray(raw) ? raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const kind = value.kind
    const url = stringValue(value.url)
    return url && (kind === 'image' || kind === 'video' || kind === 'audio') ? [{ kind, url, caption: stringValue(value.caption) ?? undefined }] : []
  }) : []
}

function legacyEvidenceForMedia(media: SelectedMemoryMedia[]): ReplayEvidence[] {
  if (!media.length) return [{
    id: 'legacy-unclassified',
    class: 'UNKNOWN',
    sourceKind: 'user-statement',
    derivedFrom: [],
    userConfirmed: false,
    presentationAllowed: true,
    provenance: { compatibility: 'legacy replay without explicit evidence manifest' },
  }]
  return media.map((item, index) => ({
    id: `legacy-source-${index + 1}`,
    class: 'CAPTURED' as const,
    sourceKind: item.kind === 'image' ? 'photo' as const : item.kind,
    sourceId: item.url,
    derivedFrom: [],
    userConfirmed: false,
    presentationAllowed: true,
    provenance: { compatibility: 'derived from legacy sourceMedia entry' },
  }))
}

export function sanitizeMemoryId(value: string | null | undefined) {
  return value && SAFE_TOKEN.test(value) ? value : null
}

export function isExplicitDemoRequest(params: URLSearchParams) {
  return params.get('demo') === '1' && params.get('memoryId')?.startsWith('demo:') === true
}

export function buildExplicitDemoMemory(id: string): SelectedMemory {
  const evidence: ReplayEvidence[] = [{
    id: 'demo-symbolic-fixture',
    class: 'SYMBOLIC',
    sourceKind: 'generated',
    derivedFrom: [],
    userConfirmed: true,
    presentationAllowed: true,
    provenance: { disclosure: 'Explicit demonstration fixture; not personal data.' },
  }]
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
      version: 2,
      durationMs: 10000,
      transcript: 'Demonstration replay. No personal memory is being shown.',
      evidence,
      segments: [
        { id: 'demo-arrival', kind: 'symbolic-bridge', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], label: 'Arrival', caption: 'The disclosed example scene opens.', narratorLine: 'This is an explicit demonstration.', startsAtMs: 0, durationMs: 2400 },
        { id: 'demo-reflection', kind: 'reflection', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], label: 'Reflection', caption: 'The example feeling becomes visible.', narratorLine: 'No personal inference is being made.', startsAtMs: 2400, durationMs: 2600 },
        { id: 'demo-context', kind: 'derived-context', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], label: 'Context', caption: 'An example relationship is disclosed.', narratorLine: 'This context exists only in the fixture.', startsAtMs: 5000, durationMs: 2800 },
        { id: 'demo-return', kind: 'symbolic-bridge', evidenceClass: 'SYMBOLIC', evidenceIds: ['demo-symbolic-fixture'], label: 'Return', caption: 'The demonstration settles.', narratorLine: 'Return to the disclosed demo Focus state.', startsAtMs: 7800, durationMs: 2200 },
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

  const sourceMedia = parseSourceMedia(raw.sourceMedia)
  const evidenceRaw = Array.isArray(replay.evidence) ? replay.evidence : null
  const parsedEvidence: ReplayEvidence[] = evidenceRaw ? evidenceRaw.flatMap((item): ReplayEvidence[] => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const evidenceId = stringValue(value.id)
    const evidenceClass = evidenceClassValue(value.class ?? value.evidenceClass)
    const sourceKind = evidenceSourceKindValue(value.sourceKind)
    if (!evidenceId || !SAFE_TOKEN.test(evidenceId) || !evidenceClass || !sourceKind) return []
    if (sourceKind === 'generated' && evidenceClass !== 'SUPPORTED_RECONSTRUCTION' && evidenceClass !== 'SYMBOLIC') return []
    const confidence = typeof value.confidence === 'number' && Number.isFinite(value.confidence)
      ? Math.max(0, Math.min(1, value.confidence))
      : undefined
    return [{
      id: evidenceId,
      class: evidenceClass,
      sourceKind,
      sourceId: stringValue(value.sourceId) ?? undefined,
      occurredAt: isoDateValue(value.occurredAt) ?? undefined,
      derivedFrom: stringArray(value.derivedFrom).filter((entry) => SAFE_TOKEN.test(entry)),
      userConfirmed: value.userConfirmed === true,
      presentationAllowed: value.presentationAllowed !== false,
      confidence,
      provenance: stringRecord(value.provenance),
    }]
  }) : legacyEvidenceForMedia(sourceMedia)

  if (evidenceRaw && parsedEvidence.length !== evidenceRaw.length) {
    return { status: 'corrupt', memory: null, message: 'The replay evidence manifest is invalid.' }
  }
  const evidenceIds = new Set(parsedEvidence.map((item) => item.id))
  if (evidenceIds.size !== parsedEvidence.length) {
    return { status: 'corrupt', memory: null, message: 'The replay evidence manifest contains duplicate source identifiers.' }
  }
  for (const item of parsedEvidence) {
    if (item.derivedFrom.some((sourceId) => !evidenceIds.has(sourceId) || sourceId === item.id)) {
      return { status: 'corrupt', memory: null, message: 'The replay evidence derivation chain is invalid.' }
    }
  }

  const legacyFallbackEvidenceIds = parsedEvidence.map((item) => item.id)
  const segments: SelectedMemoryReplaySegment[] = replaySegments.flatMap((item): SelectedMemoryReplaySegment[] => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    const segmentId = stringValue(value.id)
    if (!segmentId || !SAFE_TOKEN.test(segmentId)) return []
    const legacyPhase = legacyPhaseValue(value.id)
    const kind = segmentKindValue(value.kind) ?? (legacyPhase ? LEGACY_KIND[legacyPhase] : null)
    const label = stringValue(value.label)
    const caption = stringValue(value.caption)
    const narratorLine = stringValue(value.narratorLine)
    const startsAtMs = numberValue(value.startsAtMs, -1)
    const durationMs = numberValue(value.durationMs, -1)
    if (!kind || !label || !caption || !narratorLine) return []
    if (!Number.isSafeInteger(startsAtMs) || startsAtMs < 0) return []
    if (!Number.isSafeInteger(durationMs) || durationMs <= 0) return []

    const explicitEvidenceClass = evidenceClassValue(value.evidenceClass)
    const segmentEvidenceIds = stringArray(value.evidenceIds).filter((entry) => SAFE_TOKEN.test(entry))
    const normalizedEvidenceIds = segmentEvidenceIds.length ? segmentEvidenceIds : legacyFallbackEvidenceIds
    if (normalizedEvidenceIds.some((sourceId) => !evidenceIds.has(sourceId))) return []
    const referencedClasses = normalizedEvidenceIds.map((sourceId) => parsedEvidence.find((entry) => entry.id === sourceId)?.class).filter(Boolean) as ReplayEvidenceClass[]
    const inferredClass = referencedClasses.length && referencedClasses.every((entry) => entry === referencedClasses[0]) ? referencedClasses[0] : 'UNKNOWN'

    return [{
      id: segmentId,
      kind,
      evidenceClass: explicitEvidenceClass ?? inferredClass,
      evidenceIds: normalizedEvidenceIds,
      legacyPhase: legacyPhase ?? undefined,
      label,
      caption,
      narratorLine,
      startsAtMs,
      durationMs,
    }]
  })

  const chronologicalSegments = [...segments].sort((left, right) => left.startsAtMs - right.startsAtMs)
  const hasNonOverlappingChronology = chronologicalSegments.every((segment, index) => {
    if (index === 0) return segment.startsAtMs === 0
    const previous = chronologicalSegments[index - 1]
    return segment.startsAtMs >= previous.startsAtMs + previous.durationMs
  })
  const segmentIds = new Set(chronologicalSegments.map((segment) => segment.id))
  const finalSegment = chronologicalSegments.at(-1)
  const finalSegmentEndMs = finalSegment ? finalSegment.startsAtMs + finalSegment.durationMs : -1
  if (
    replaySegments.length < 1
    || segments.length !== replaySegments.length
    || segmentIds.size !== segments.length
    || !hasNonOverlappingChronology
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
      sourceMedia,
      privacy,
      replayManifest: {
        id: replayId,
        version: numberValue(replay?.version, 1),
        durationMs: replayDurationMs,
        segments: chronologicalSegments,
        evidence: parsedEvidence,
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
