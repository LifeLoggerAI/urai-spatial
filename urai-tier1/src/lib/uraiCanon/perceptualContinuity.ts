export type ContinuityEnvelope = {
  inTransition: boolean
  homeSceneVisible: boolean
  lifemapSceneVisible: boolean
  homeTravelBlend: number
  lifemapTravelBlend: number
  homeOpacity: number
  lifemapOpacity: number
  arrivalSettle: number
}

function clamp01(v: number): number {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function getContinuityEnvelope(transitionT: number): ContinuityEnvelope {
  const t = clamp01(transitionT)
  const eased = easeInOutCubic(t)
  const inTransition = t > 0 && t < 1
  const homeOpacity = 1 - eased
  const lifemapOpacity = eased
  const arrivalSettle = 1 - Math.abs(1 - (eased * 2))
  return {
    inTransition,
    homeSceneVisible: t < 1,
    lifemapSceneVisible: t > 0,
    homeTravelBlend: eased,
    lifemapTravelBlend: eased,
    homeOpacity,
    lifemapOpacity,
    arrivalSettle,
  }
}
