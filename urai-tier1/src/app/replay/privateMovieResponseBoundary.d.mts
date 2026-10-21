export function readBoundedPrivateMovieBlob(
  response: Response,
  options: {
    kind: 'mp4' | 'srt'
    expectedBytes: number
    signal: AbortSignal
    isCurrent: () => boolean
  },
): Promise<Blob>
