/** A source-media clock is authoritative for timed Life Movie captions.
 * Never display a guessed story beat when the recorded source and authored
 * Replay manifest have incompatible durations. No source text is rewritten. */
export type LifeMovieCaptionSegment = {
  startsAtMs: number
  durationMs: number
  caption: string
}

export function captionSegmentForMediaTime<T extends LifeMovieCaptionSegment>(
  segments: readonly T[],
  mediaTimeMs: number,
  manifestDurationMs: number,
  sourceDurationMs: number | null,
): T | null {
  if (!Array.isArray(segments) || !Number.isFinite(mediaTimeMs) || mediaTimeMs < 0
    || !Number.isSafeInteger(manifestDurationMs) || manifestDurationMs <= 0
    || sourceDurationMs === null || !Number.isFinite(sourceDurationMs) || sourceDurationMs <= 0) return null

  // Container durations differ slightly due to encoding. Large differences
  // signal a different recording or an unbound authored timeline.
  const toleranceMs = Math.max(750, Math.min(2500, manifestDurationMs * 0.05))
  if (Math.abs(sourceDurationMs - manifestDurationMs) > toleranceMs) return null

  return segments.find((segment) =>
    Number.isSafeInteger(segment.startsAtMs) && segment.startsAtMs >= 0
    && Number.isSafeInteger(segment.durationMs) && segment.durationMs > 0
    && segment.startsAtMs + segment.durationMs <= manifestDurationMs
    && mediaTimeMs >= segment.startsAtMs
    && mediaTimeMs < segment.startsAtMs + segment.durationMs
    && typeof segment.caption === 'string' && segment.caption.trim().length > 0
  ) ?? null
}
