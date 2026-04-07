export type LifeMapStar = {
  id: string
  x: number
  y: number
  z: number
  band?: 'near' | 'mid' | 'far'
  intensity?: number
  size?: number
  opacity?: number
  label?: string
}

export async function readLifeMapStars(): Promise<LifeMapStar[]> {
  return [
    { id: 'star_1', x: 0,   y: 0,   z: -36, band: 'near', intensity: 2.4, size: 9.0, opacity: 1.0, label: 'Star 1' },
    { id: 'star_2', x: 14,  y: 6,   z: -42, band: 'near', intensity: 2.1, size: 8.0, opacity: 1.0, label: 'Star 2' },
    { id: 'star_3', x: -14, y: 5,   z: -42, band: 'near', intensity: 2.1, size: 8.0, opacity: 1.0, label: 'Star 3' },
    { id: 'star_4', x: 0,   y: -10, z: -34, band: 'near', intensity: 2.5, size: 10.0, opacity: 1.0, label: 'Star 4' }
  ]
}

export default readLifeMapStars
