export type SpatialEmotion =
  | 'calm'
  | 'clarity'
  | 'tension'
  | 'weight'
  | 'wonder'
  | 'recovery'

export type SpatialMemory = {
  id: string
  ts: number
  title: string
  emotion: SpatialEmotion
  intensity: number
  x: number
  y: number
  z: number
  summary?: string
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
