
export interface StarNodeData {
  id: string
  time: number // 0 → 1 (past → future)
  emotion: number // 0 → 1 intensity
  recency: number // 0 → 1 (older → newer)
  weight: number
  position: [number, number, number]
}

export function generateStructuredStars(count = 200): StarNodeData[] {
  const stars: StarNodeData[] = []

  for (let i = 0; i < count; i++) {
    const time = i / count
    const emotion = Math.random()
    const recency = 1 - time
    const weight = Math.random()

    const x = (time - 0.5) * 40
    const y = (emotion - 0.5) * 20
    const z = (recency - 0.5) * 15

    stars.push({
      id: `star-${i}`,
      time,
      emotion,
      recency,
      weight,
      position: [x, y, z],
    })
  }

  return stars
}
