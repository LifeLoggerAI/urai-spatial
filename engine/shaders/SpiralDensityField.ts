export function spiralDensity(
  x: number,
  z: number,
  arms: number = 4
) {

  const r =
    Math.sqrt(x * x + z * z)

  const angle =
    Math.atan2(z, x)

  // spiral twist factor
  const twist = 0.015

  const spiralAngle =
    angle - r * twist

  // arm alignment
  const arm =
    Math.cos(spiralAngle * arms)

  // concentrate stars toward arm center
  const armStrength =
    Math.pow(
      Math.max(0, arm),
      4
    )

  // radial galaxy falloff
  const radialFalloff =
    Math.exp(-r * 0.004)

  return armStrength * radialFalloff

}