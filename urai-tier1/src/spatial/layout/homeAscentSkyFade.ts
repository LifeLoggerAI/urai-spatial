/**
 * Preserve the original painted Home sky at the first Ascent frame and reveal
 * the real 3D starfield gradually as the existing camera rises. This only
 * controls opacity of an actual WebGL shader; it does not generate film frames.
 */
export function homeAscentSkyOpacity(phase: string, progress: number): number {
  if (phase !== 'ASCENT' || !Number.isFinite(progress)) return 1
  const p = Math.max(0, Math.min(1, progress))
  const t = Math.max(0, Math.min(1, (p - 0.04) / 0.84))
  return 1 - t * t * (3 - 2 * t)
}
