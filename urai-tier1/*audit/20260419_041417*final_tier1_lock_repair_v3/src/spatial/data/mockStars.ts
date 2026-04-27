import { spatialMemories } from './spatialMemoryStore'

export type LifeMapStar = {
  id: string
  t: number
  intensity: number
  emotion: number
  x: number
  y: number
  z: number
}

export const mockStars: LifeMapStar[] = spatialMemories.map((m) => ({
  id: m.id,
  t: m.ts,
  intensity: m.intensity,
  emotion:
    m.emotion === 'calm' ? 0.18 :
    m.emotion === 'clarity' ? 0.36 :
    m.emotion === 'wonder' ? 0.52 :
    m.emotion === 'recovery' ? 0.66 :
    m.emotion === 'weight' ? 0.82 :
    0.94,
  x: m.x,
  y: m.y,
  z: m.z,
}))
