export const FOCUS_STAR_TARGET = [0, 0, -1.05] as const
const BASE_RADIUS = 5.1

/** Keep the stellar subject framed by the smaller viewport dimension. */
export function focusCameraPosition(aspect: number): [number, number, number] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const radius = BASE_RADIUS / Math.min(1, safeAspect)
  return [0, .08, FOCUS_STAR_TARGET[2] + radius]
}

export function focusCameraMaxRadius(aspect: number): number {
  return Math.max(8.2, (focusCameraPosition(aspect)[2] - FOCUS_STAR_TARGET[2]) * 1.5)
}
