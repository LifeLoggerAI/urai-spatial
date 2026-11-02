/** A route hint is never permission to fetch or display private memories. */
export function lifeMovieRouteScope(movieId: string | null, memoryId: string | null): string {
  return JSON.stringify([movieId, memoryId])
}

export type LifeMovieRequestIdentity = {
  ownerId: string | null
  ownerEpoch: number
  routeScope: string
}

/** Reject results from another owner, route, or prior lifecycle generation. */
export function lifeMovieRequestCurrent(
  expected: LifeMovieRequestIdentity,
  current: LifeMovieRequestIdentity,
): boolean {
  return expected.ownerId !== null
    && expected.ownerId === current.ownerId
    && expected.ownerEpoch === current.ownerEpoch
    && expected.routeScope === current.routeScope
}

/** Preserve sanitized, first-party movie selection through the existing login. */
export function lifeMovieSignInHref(movieId: string | null, memoryId: string | null): string {
  const params = new URLSearchParams()
  if (movieId) params.set('movieId', movieId)
  if (memoryId) params.set('memoryId', memoryId)
  const selection = `/life-movie${params.size ? `?${params.toString()}` : ''}`
  return `/login?returnTo=${encodeURIComponent(selection)}`
}
