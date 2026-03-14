export function depthGlow(distance:number){

  const near = 40
  const far = 800

  let t = (distance - near) / (far - near)

  t = Math.max(0, Math.min(1, t))

  return 1 - (t * t)

}