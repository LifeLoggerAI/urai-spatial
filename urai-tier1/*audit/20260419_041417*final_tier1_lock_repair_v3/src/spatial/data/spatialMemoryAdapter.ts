import type { SpatialEmotion, SpatialMemory } from './spatialMemory'
import { spatialMemories } from './spatialMemoryStore'

export type SpatialMemoryRecord = {
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

export function toSpatialMemory(record: SpatialMemoryRecord): SpatialMemory {
  return {
    id: record.id,
    ts: record.ts,
    title: record.title,
    emotion: record.emotion,
    intensity: record.intensity,
    x: record.x,
    y: record.y,
    z: record.z,
    summary: record.summary,
  }
}

export function getSpatialMemories(): SpatialMemory[] {
  return spatialMemories
}

export function getSpatialMemory(id: string | null | undefined): SpatialMemory | null {
  if (!id) return null
  const found = spatialMemories.find((m) => m.id === id)
  return found ?? null
}

export function getSpatialStars(memories: SpatialMemory[] = spatialMemories) {
  return memories.map((m) => ({
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
}
