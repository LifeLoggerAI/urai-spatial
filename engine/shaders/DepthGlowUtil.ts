export function depthGlow(distance: number) {

  const near = 40
  const far = 800

  const t =
    Math.min(
      1,
      Math.max(
        0,
        (distance - near) / (far - near)
      )
    )

  // smoother falloff curve
  const glow =
    1 - (t * t)

  return glow

}