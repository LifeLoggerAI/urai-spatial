export function spiralDensity(
  x:number,
  z:number,
  arms:number = 4
){

  const r =
    Math.sqrt(x*x + z*z)

  const angle =
    Math.atan2(z,x)

  const spiral =
    Math.sin(angle * arms + r * 0.04)

  const armStrength =
    1 - Math.abs(spiral)

  const radialFalloff =
    Math.exp(-r * 0.002)

  return Math.max(
    0,
    armStrength * radialFalloff
  )
}