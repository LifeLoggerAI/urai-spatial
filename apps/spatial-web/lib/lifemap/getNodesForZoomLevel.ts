import { ZoomLevel } from '../../engine/state/useSceneStore'

export interface StarNode {
  id: string
  position: [number, number, number]
  group?: string
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateNodes(count: number, radius: number): StarNode[] {
  return Array.from({ length: count }).map((_, i) => {
    const theta = seededRandom(i) * Math.PI * 2
    const phi = seededRandom(i + 999) * Math.PI

    return {
      id: `${radius}-${i}`,
      position: [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      ],
    }
  })
}

export function getNodesForZoomLevel(
  zoomLevel: ZoomLevel
): StarNode[] {
  switch (zoomLevel) {
    case 'decade':
      return generateNodes(12, 60)

    case 'year':
      return generateNodes(40, 35)

    case 'month':
      return generateNodes(120, 20)

    case 'day':
      return generateNodes(250, 10)

    case 'moment':
      return generateNodes(1, 2)

    default:
      return []
  }
}
