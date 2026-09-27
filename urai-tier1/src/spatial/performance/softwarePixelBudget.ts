/** CPU WebGL fallback only. DOM text and controls retain native resolution. */
export function softwarePixelRatio(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1
  return Math.min(1, Math.sqrt(320_000 / (width * height)))
}
