export type StarTone =
  | 'neutral'
  | 'warm'
  | 'cool'
  | 'joy'
  | 'grief'
  | 'focus'
  | 'memory'
  | 'mystery'
  | 'warning'
  | 'dream'

export type Vec3 = [number, number, number]

export type LifeMapStar = {
  id: string
  label: string
  position: Vec3
  tone: StarTone | string
  intensity: number
  stability: number
  createdAt?: number | null
  updatedAt?: number | null
  source?: string
  metadata?: Record<string, unknown>
}

# Canonical UI/interaction type.
# This kills SelectedStar vs StarNode drift.
export type SelectedStar = LifeMapStar
export type StarNode = LifeMapStar
