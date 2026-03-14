export interface StarPosition {
  id: string
  position: [number, number, number]
  size: number
}

const STAR_COUNT = 140
const RADIUS = 10
const GOLDEN_RATIO = 1.61803398875

export const starData: ReadonlyArray<StarPosition> = Array.from(
  { length: STAR_COUNT },
  (_, i) => {

    const theta = (i / STAR_COUNT) * Math.PI * 2
    const phi = (i * GOLDEN_RATIO) % Math.PI

    const x = RADIUS * Math.cos(theta) * Math.sin(phi)
    const y = RADIUS * Math.sin(theta) * Math.sin(phi)
    const z = RADIUS * Math.cos(phi)

    return {
      id: i.toString(),
      position: [x, y, z] as [number, number, number],
      size: 0.02 + (i % 5) * 0.004
    }

  }
) as const