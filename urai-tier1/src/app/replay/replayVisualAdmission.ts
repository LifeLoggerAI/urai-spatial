import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import type { PrivateMovieRouteSelection } from '@/spatial/life-movie/privateLifeMovieRouteSelection'

export type ReplayVisualAdmission =
  | { kind: 'recorded-source'; media: SelectedMemoryMedia }
  | { kind: 'disclosed-demo'; media: null }
  | { kind: 'neutral'; media: null }

export type ReplayAuthorizedSource = 'owned-receipt' | 'protected-life-movie'

/** Private media may be admitted only after the calling runtime's current
 * consent/receipt-bound authority hook has released a local Blob URL.
 * A legacy Storage download URL, even one from the expected bucket, is
 * not proof of revocable playback authority. Demo assets are separate. */
export function replayVisualAdmission(
  memory: SelectedMemory,
  sourceAuthority: ReplayAuthorizedSource | null = null,
): ReplayVisualAdmission {
  const media = memory.sourceMedia.find((item) => item.kind === 'video' || item.kind === 'image' || item.kind === 'audio')
  if (media && (memory.demo || ((sourceAuthority === 'owned-receipt' || sourceAuthority === 'protected-life-movie')
    && media.url.startsWith('blob:')))) {
    return { kind: 'recorded-source', media }
  }
  return memory.demo ? { kind: 'disclosed-demo', media: null } : { kind: 'neutral', media: null }
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
