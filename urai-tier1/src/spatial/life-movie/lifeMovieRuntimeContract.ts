import { sanitizeMemoryId } from '@/spatial/memory/selectedMemoryContract'

export type LifeMovieTruthClass =
  | 'RECORDED_SOURCE_TRUTH'
  | 'ATTRIBUTED_FAMILY_RECOLLECTION'
  | 'SPATIALLY_RECONSTRUCTABLE'
  | 'INTERPRETIVE_CINEMATIC_RECREATION'
  | 'UNKNOWN_UNRESOLVED'

export type LifeMovieRuntimeChapter = {
  id: string
  memoryId: string
  order: number
  title?: string
  truthClass: LifeMovieTruthClass
  confidence: number
  consentState: 'authorized'
  cinematicAssetId?: string
  spatialAssetId?: string
  captionTrackId?: string
  audioMixId?: string
  languageTracks: string[]
  replayEntry?: string
  replayExit?: string
  provenance: {
    sourceIds: string[]
    storyNodeIds: string[]
    objectIds: string[]
    providerTaskIds: string[]
  }
}

export type LifeMovieRuntimeManifest = {
  id: string
  version: number
  ownerId: string
  status: 'draft' | 'ready'
  chapters: LifeMovieRuntimeChapter[]
}

export type LifeMovieManifestResult =
  | { status: 'ready' | 'draft'; manifest: LifeMovieRuntimeManifest; message: string }
  | { status: 'unavailable' | 'unauthorized' | 'corrupt'; manifest: null; message: string }

const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,160}$/
// Matches the canonical Functions manifest writer's bounded chapter count.
const MAX_CHAPTERS = 64
const TRUTH_CLASSES: readonly LifeMovieTruthClass[] = [
  'RECORDED_SOURCE_TRUTH',
  'ATTRIBUTED_FAMILY_RECOLLECTION',
  'SPATIALLY_RECONSTRUCTABLE',
  'INTERPRETIVE_CINEMATIC_RECREATION',
  'UNKNOWN_UNRESOLVED',
]

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function safeToken(value: unknown) {
  const token = text(value)
  return token && SAFE_TOKEN.test(token) ? token : null
}

function safeTokenArray(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const token = safeToken(entry)
        return token ? [token] : []
      })
    : []
}

function truthClass(value: unknown): LifeMovieTruthClass | null {
  return typeof value === 'string' && TRUTH_CLASSES.includes(value as LifeMovieTruthClass)
    ? value as LifeMovieTruthClass
    : null
}

function internalMemoryHref(value: unknown, memoryId: string, chapterId: string) {
  const raw = text(value)
  if (!raw || !raw.startsWith('/')) return null
  try {
    const parsed = new URL(raw, 'https://urai.invalid')
    if (parsed.origin !== 'https://urai.invalid') return null
    const allowed = [
      '/life-map',
      '/focus',
      '/replay',
      '/life-movie',
      '/spatial/memory-world',
      '/spatial/captured-reality',
      '/spatial/interpretive-world',
    ]
    if (!allowed.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix + '/'))) return null
    // Stored navigation must never redirect the selected chapter to another
    // memory, even if an old manifest includes a misleading internal URL.
    const memoryIds = parsed.searchParams.getAll('memoryId')
    const chapterIds = parsed.searchParams.getAll('chapterId')
    if (memoryIds.length && (memoryIds.length !== 1 || memoryIds[0] !== memoryId)) return null
    if (chapterIds.length && (chapterIds.length !== 1 || chapterIds[0] !== chapterId)) return null
    parsed.searchParams.set('memoryId', memoryId)
    if (parsed.pathname === '/replay') {
      parsed.searchParams.set('chapterId', chapterId)
      parsed.searchParams.set('from', 'life-movie')
    }
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return null
  }
}

function parseChapter(raw: unknown): LifeMovieRuntimeChapter | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (value.consentState !== 'authorized') return null

  const id = safeToken(value.id)
  const memoryId = sanitizeMemoryId(text(value.memoryId))
  const order = value.order
  const chapterTruth = truthClass(value.truthClass)
  const confidence = value.confidence
  const consentState = 'authorized' as const
  if (
    !id
    || !memoryId
    || typeof order !== 'number'
    || !Number.isSafeInteger(order)
    || order < 0
    || !chapterTruth
    || typeof confidence !== 'number'
    || !Number.isFinite(confidence)
    || confidence < 0
    || confidence > 1
  ) return null

  const replayEntry = internalMemoryHref(value.replayEntry, memoryId, id)
  const replayExit = internalMemoryHref(value.replayExit, memoryId, id)
  if ((value.replayEntry != null && !replayEntry) || (value.replayExit != null && !replayExit)) return null

  const provenanceRaw = value.provenance && typeof value.provenance === 'object'
    ? value.provenance as Record<string, unknown>
    : {}

  return {
    id,
    memoryId,
    order,
    title: text(value.title) ?? undefined,
    truthClass: chapterTruth,
    confidence,
    consentState,
    cinematicAssetId: safeToken(value.cinematicAssetId) ?? undefined,
    spatialAssetId: safeToken(value.spatialAssetId) ?? undefined,
    captionTrackId: safeToken(value.captionTrackId) ?? undefined,
    audioMixId: safeToken(value.audioMixId) ?? undefined,
    languageTracks: safeTokenArray(value.languageTracks),
    replayEntry: replayEntry ?? undefined,
    replayExit: replayExit ?? undefined,
    provenance: {
      sourceIds: safeTokenArray(provenanceRaw.sourceIds),
      storyNodeIds: safeTokenArray(provenanceRaw.storyNodeIds),
      objectIds: safeTokenArray(provenanceRaw.objectIds),
      providerTaskIds: safeTokenArray(provenanceRaw.providerTaskIds),
    },
  }
}

export function parseLifeMovieRuntimeManifest(
  raw: Record<string, unknown>,
  expectedOwnerId: string,
): LifeMovieManifestResult {
  const ownerId = text(raw.ownerId)
  if (!ownerId || ownerId !== expectedOwnerId) {
    return { status: 'unauthorized', manifest: null, message: 'Life Movie is not available to this account.' }
  }
  if (raw.consentState !== 'authorized') {
    return { status: 'unauthorized', manifest: null, message: 'Life Movie consent is not authorized.' }
  }

  const id = safeToken(raw.id)
  const version = raw.version
  const status = raw.status === 'ready' ? 'ready' : raw.status === 'draft' ? 'draft' : null
  if (!id || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1 || !status
    || !Array.isArray(raw.chapters) || raw.chapters.length < 1 || raw.chapters.length > MAX_CHAPTERS) {
    return { status: 'corrupt', manifest: null, message: 'Life Movie manifest is incomplete.' }
  }

  const chapters = raw.chapters.map(parseChapter)
  if (chapters.some((chapter) => chapter === null)) {
    return { status: 'corrupt', manifest: null, message: 'Life Movie contains an invalid or revoked chapter.' }
  }

  const validChapters = chapters as LifeMovieRuntimeChapter[]
  const chapterIds = new Set(validChapters.map((chapter) => chapter.id))
  const memoryIds = new Set(validChapters.map((chapter) => chapter.memoryId))
  const orders = new Set(validChapters.map((chapter) => chapter.order))
  if (
    chapterIds.size !== validChapters.length
    || memoryIds.size !== validChapters.length
    || orders.size !== validChapters.length
  ) {
    return { status: 'corrupt', manifest: null, message: 'Life Movie chapter identity is ambiguous.' }
  }

  validChapters.sort((left, right) => left.order - right.order)

  return {
    status,
    message: status === 'ready' ? 'Life Movie manifest ready.' : 'Life Movie draft manifest pending approval.',
    manifest: { id, version, ownerId, status, chapters: validChapters },
  }
}

export function lifeMovieReplayHref(chapter: LifeMovieRuntimeChapter) {
  const entry = internalMemoryHref(chapter.replayEntry, chapter.memoryId, chapter.id)
  if (entry) return entry
  const params = new URLSearchParams({ memoryId: chapter.memoryId, from: 'life-movie', chapterId: chapter.id })
  return '/replay?' + params.toString()
}

export function lifeMovieReturnHref(chapter: LifeMovieRuntimeChapter) {
  const exit = internalMemoryHref(chapter.replayExit, chapter.memoryId, chapter.id)
  return exit ?? '/life-movie?memoryId=' + encodeURIComponent(chapter.memoryId)
}
