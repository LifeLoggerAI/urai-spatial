
type Vec3 = [number, number, number]

const starPositionMap = new Map<string, Vec3>()

export function registerStarPosition(id: string, position: Vec3) {
  starPositionMap.set(id, position)
}

export function getStarPosition(id: string | null): Vec3 | null {
  if (!id) return null
  return starPositionMap.get(id) ?? null
}

export function clearStarRegistry() {
  starPositionMap.clear()
}
