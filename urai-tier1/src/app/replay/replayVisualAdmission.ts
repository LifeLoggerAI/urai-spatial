import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import type { PrivateMovieRouteSelection } from '@/spatial/life-movie/privateLifeMovieRouteSelection'

export type ReplayVisualAdmission =
  | { kind: 'recorded-source'; media: SelectedMemoryMedia }
  | { kind: 'disclosed-demo'; media: null }
  | { kind: 'neutral'; media: null }

export function replayVisualAdmission(memory: SelectedMemory): ReplayVisualAdmission {
  // Owner-readable memory metadata never grants playback of historical Storage
  // URLs. Private media requires an independently authorized receipt-backed
  // playback source, which is not yet connected to this legacy view.
  if (!memory.demo) return { kind: 'neutral', media: null }
  const media = memory.sourceMedia.find((item) => item.kind === 'video' || item.kind === 'image')
  if (media) return { kind: 'recorded-source', media }
  return { kind: 'disclosed-demo', media: null }
}

/** Reset and tear down playback across ownership, source, privacy, and manifest changes. */
export function replaySessionIdentity(memory: SelectedMemory, selectedMovie?: PrivateMovieRouteSelection | null) {
  return JSON.stringify([
    memory.ownerId,
    memory.id,
    memory.demo,
    memory.privacy,
    memory.replayManifest.id,
    memory.replayManifest.version,
    memory.replayManifest.durationMs,
    memory.sourceMedia.map(({ kind, url, caption }) => [kind, url, caption ?? null]),
    ...(memory.sourceMediaReceipts?.length ? [memory.sourceMediaReceipts.map(({ kind, mediaReceiptId, caption }) => [kind, mediaReceiptId, caption ?? null])] : []),
    ...(selectedMovie ? [['protected-movie', selectedMovie.planId, selectedMovie.movieId]] : []),
  ])
}
