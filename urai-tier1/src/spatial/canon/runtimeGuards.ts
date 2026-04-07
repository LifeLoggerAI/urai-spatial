export function assertNoScaleDrivenPhaseChange(source: string) {
  const banned = [
    "scale.setScalar(",
    "scale.x =",
    "scale.y =",
    "scale.z =",
  ]
  return banned.every((token) => !source.includes(token))
}

export function assertNoDirectSetMode(source: string) {
  return !source.includes("setMode(")
}

export function assertSingleCameraWriter(source: string) {
  const hits = (source.match(/camera\.position|camera\.lookAt|camera\.fov/g) || []).length
  return hits <= 6
}
