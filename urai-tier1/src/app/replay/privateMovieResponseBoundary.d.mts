export function readBoundedPrivateMovieBlob(
  response: Response,
  options: {
    kind: 'mp4' | 'srt'
    expectedBytes: number
    signal: AbortSignal
    isCurrent: () => boolean
  },
): Promise<Blob>

export function readBoundedPrivateMovieTimelineText(
  response: Response,
  options: {
    signal: AbortSignal
    isCurrent: () => boolean
  },
): Promise<string>
