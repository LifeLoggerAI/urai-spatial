/** A distant Home destination is physical space, not a permanent billboard.
 * Reveal localized text only while the player is near its interaction target.
 * Existing pointer, keyboard, screen-reader and transition authorities remain separate.
 */
export type HomeThresholdTarget = 'ground' | 'life-map'
export type HomeThresholdProximity = HomeThresholdTarget | 'orb' | null

export function showHomeThresholdLabel(
  phase: string,
  nearby: HomeThresholdProximity,
  destination: HomeThresholdTarget,
): boolean {
  return phase === 'HOME' && nearby === destination
}
