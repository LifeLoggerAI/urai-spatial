/**
 * Validate the declared body size before downloading any protected Life Movie
 * video or caption bytes. Enforce the same limits on the final and segmented
 * delivery paths; never infer an allowed size for an unknown media kind.
 */
export const PRIVATE_MOVIE_MAX_VIDEO_BYTES = 64 * 1024 * 1024
export const PRIVATE_MOVIE_MAX_SUBTITLE_BYTES = 2 * 1024 * 1024

export function privateMovieContentLengthAllowed(kind: 'mp4' | 'srt', length: number): boolean {
  if (!Number.isSafeInteger(length) || length < 1) return false
  if (kind === 'mp4') return length <= PRIVATE_MOVIE_MAX_VIDEO_BYTES
  if (kind === 'srt') return length <= PRIVATE_MOVIE_MAX_SUBTITLE_BYTES
  return false
}
