/** Browser-visible shape only. The authoritative digest and individual media
 * checks belong to Jobs and the Studio server, never to this client parser. */
export type PrivateLifeMovieSegment = Readonly<{
  index: number
  startMs: number
  endMs: number
  gapBeforeMs: number
}>
export type PrivateLifeMovieTimeline = Readonly<{
  schemaVersion: 'urai-spatial-private-segment-timeline-v1'
  movieId: string
  planId: string
  playlistDigest: string
  expiresAt: number
  durationMs: number
  segments: readonly PrivateLifeMovieSegment[]
}>

const DIGEST = /^[a-f0-9]{64}$/
const bounded = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('private_timeline_unavailable')
  return value as Record<string, unknown>
}
function exactly(value: Record<string, unknown>, keys: readonly string[]) {
  const present = Object.keys(value)
  if (present.length !== keys.length || present.some(key => !keys.includes(key)))
    throw new Error('private_timeline_unavailable')
}

/** Reject unknown fields, inflated durations, stale authority and made-up gaps.
 * This is defense in depth, not a substitute for Studio's signed playlist. */
export function parsePrivateLifeMovieTimeline(
  body: unknown, movieId: string, planId: string, now = Date.now(),
): PrivateLifeMovieTimeline {
  const envelope = record(body)
  exactly(envelope, ['ok', 'timeline'])
  if (envelope.ok !== true) throw new Error('private_timeline_unavailable')
  const value = record(envelope.timeline)
  exactly(value, ['schemaVersion','movieId','planId','playlistDigest','expiresAt','durationMs','segments'])
  if (value.schemaVersion !== 'urai-spatial-private-segment-timeline-v1' ||
      value.movieId !== movieId || value.planId !== planId ||
      typeof value.playlistDigest !== 'string' || !DIGEST.test(value.playlistDigest) ||
      !bounded(value.expiresAt) || value.expiresAt <= now ||
      value.expiresAt > now + 300_000 ||
      !bounded(value.durationMs) || value.durationMs === 0 ||
      value.durationMs > 45 * 60 * 1000 ||
      !Array.isArray(value.segments) ||
      value.segments.length < 1 || value.segments.length > 180)
    throw new Error('private_timeline_unavailable')
  const segments: PrivateLifeMovieSegment[] = []
  let priorEnd = 0
  for (const [index, raw] of value.segments.entries()) {
    const segment = record(raw)
    exactly(segment, ['index','startMs','endMs','gapBeforeMs'])
    if (segment.index !== index || !bounded(segment.startMs) ||
        !bounded(segment.endMs) || !bounded(segment.gapBeforeMs) ||
        segment.startMs < priorEnd || segment.endMs <= segment.startMs ||
        segment.endMs - segment.startMs > 15_000 ||
        segment.gapBeforeMs !== segment.startMs - priorEnd ||
        segment.endMs > value.durationMs)
      throw new Error('private_timeline_unavailable')
    segments.push(Object.freeze({
      index, startMs: segment.startMs, endMs: segment.endMs, gapBeforeMs: segment.gapBeforeMs,
    }))
    priorEnd = segment.endMs
  }
  if (priorEnd !== value.durationMs) throw new Error('private_timeline_unavailable')
  return Object.freeze({
    schemaVersion: 'urai-spatial-private-segment-timeline-v1',
    movieId, planId, playlistDigest: value.playlistDigest,
    expiresAt: value.expiresAt, durationMs: value.durationMs,
    segments: Object.freeze(segments),
  })
}

/** A selected timeline cannot authorize new private bytes after expiry. */
export function privateLifeMovieTimelineCurrent(timeline: PrivateLifeMovieTimeline | null | undefined, now = Date.now()): boolean {
  return Boolean(timeline && Number.isSafeInteger(now) && Number.isSafeInteger(timeline.expiresAt)
    && timeline.expiresAt > now)
}

/** Explicit timeline gaps choose the next authorized frame, not a fabricated clip. */
export function selectPrivateLifeMovieSegment(timeline: PrivateLifeMovieTimeline, positionMs: number) {
  if (!Number.isFinite(positionMs) || positionMs < 0 || positionMs > timeline.durationMs)
    throw new Error('private_seek_outside_timeline')
  const position = Math.min(positionMs, timeline.durationMs - 1)
  const selected = timeline.segments.find(segment => position >= segment.startMs && position < segment.endMs) ??
    timeline.segments.find(segment => position < segment.startMs)
  if (!selected) throw new Error('private_seek_outside_timeline')
  const localMs = Math.max(0, position - selected.startMs)
  return { segment: selected, localMs }
}

/** Jobs emits segment-local SRT. Never combine a prior segment's captions. */
export function currentPrivateLifeMovieCaption(srt: string | null, localTimeMs: number): string | null {
  if (!srt || !Number.isFinite(localTimeMs) || localTimeMs < 0) return null
  const time = (stamp: string) => {
    const match = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(stamp)
    if (!match) return null
    const h = Number(match[1]), m = Number(match[2]), s = Number(match[3]), ms = Number(match[4])
    return m < 60 && s < 60 ? ((h * 60 + m) * 60 + s) * 1000 + ms : null
  }
  for (const block of srt.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    const lines = block.split('\n')
    const cue = lines.findIndex(line => line.includes(' --> '))
    if (cue < 0) continue
    const range = /^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/.exec(lines[cue].trim())
    if (!range) continue
    const start = time(range[1]), end = time(range[2])
    if (start !== null && end !== null && localTimeMs >= start && localTimeMs < end)
      return lines.slice(cue + 1).join('\n').trim().slice(0, 4000) || null
  }
  return null
}
