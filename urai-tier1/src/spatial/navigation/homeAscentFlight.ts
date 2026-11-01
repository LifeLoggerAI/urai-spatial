/** Original Home's cinematic Ascent camera. Positions are in the existing Home world's meters. */
export type HomeAscentPoint = readonly [number, number, number]
export type HomeAscentPose = { position: HomeAscentPoint; lookAt: HomeAscentPoint }

const clamp01 = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0
const ease = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t) }
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const mix3 = (a: HomeAscentPoint, b: HomeAscentPoint, t: number): HomeAscentPoint => [
  mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t),
]

/**
 * Stay over the real modeled sanctuary and look back at its physical terrain
 * while rising, then turn into the sky for the existing LifeMap handoff.
 * The previous 44m/-54m straight-line flight aimed into empty sky almost at once.
 * The camera must remain south of its -9m sanctuary look target until skyward turn,
 * or it will look backward near the end of the climb.
 * Reduced-motion leaves the camera stationary: the route can crossfade instead.
 */
export function sampleHomeAscentFlight(
  progress: number,
  origin: HomeAscentPoint,
  initialLookAt: HomeAscentPoint,
  reducedMotion = false,
): HomeAscentPose {
  if (reducedMotion) return { position: [...origin], lookAt: [...initialLookAt] }
  const t = clamp01(progress)
  const position = mix3(origin, [-1.5, 39, -6], ease(t))
  const sanctuaryAim: HomeAscentPoint = [0, 0.8, -9]
  const landscapeLook = mix3(initialLookAt, sanctuaryAim, ease(t / 0.18))
  const skyLook: HomeAscentPoint = [0, 47, -30]
  const lookAt = mix3(landscapeLook, skyLook, ease((t - 0.80) / 0.20))
  return { position, lookAt }
}
