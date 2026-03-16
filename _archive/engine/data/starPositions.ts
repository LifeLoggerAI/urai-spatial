export interface StarPosition {
  id: string
  position: [number, number, number]
  size: number
}

const STAR_COUNT = 140
const RADIUS = 10
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export const starData: ReadonlyArray<StarPosition> = Array.from(
  { length: STAR_COUNT },
  (_, i) => {
    const t = (i + 0.5) / STAR_COUNT
    const y = 1 - 2 * t
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = i * GOLDEN_ANGLE

    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY

    return {
      id: i.toString(),
      position: [
        x * RADIUS,
        y * RADIUS,
        z * RADIUS,
      ],
      size: 0.02 + (i % 5) * 0.004,
    }
  }
)