/** A Blob URL admitted for one Firebase User never survives an identity change.
 * It is intentionally scoped by both the exact actor object and owner UID. */
export type OwnerMediaState<T, A extends { uid: string }> = {
  key: string
  status: 'absent' | 'loading' | 'ready' | 'unavailable'
  media: T[]
  actor?: A | null
}

export function currentOwnerMediaState<T, A extends { uid: string }>(
  playback: OwnerMediaState<T, A>,
  key: string,
  ownerId: string | null | undefined,
  liveActor: A | null,
  receiptPresent: boolean,
): OwnerMediaState<T, A> {
  const closed: OwnerMediaState<T, A> = { key, status: receiptPresent ? 'loading' : 'absent', media: [] }
  if (playback.key !== key) return closed
  if (playback.status !== 'ready') return playback
  if (!playback.actor || playback.actor !== liveActor || playback.actor.uid !== ownerId) return closed
  return playback
}
