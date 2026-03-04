export interface ReplayMemory {
  id: string
  title: string
  timestamp: number
  emotionalWeight: number // 0 → 1
  type: 'milestone' | 'relationship' | 'work' | 'growth'
}

export const replayMemoryData: ReplayMemory[] = [
  { id: 'm1', title: 'Start Project', timestamp: 0.05, emotionalWeight: 0.6, type: 'growth' },
  { id: 'm2', title: 'First Win', timestamp: 0.15, emotionalWeight: 0.8, type: 'milestone' },
  { id: 'm3', title: 'Major Stress', timestamp: 0.28, emotionalWeight: 0.9, type: 'work' },
  { id: 'm4', title: 'Personal Breakthrough', timestamp: 0.4, emotionalWeight: 1.0, type: 'growth' },
  { id: 'm5', title: 'Relationship Shift', timestamp: 0.55, emotionalWeight: 0.75, type: 'relationship' },
  { id: 'm6', title: 'Recovery Phase', timestamp: 0.7, emotionalWeight: 0.5, type: 'growth' },
  { id: 'm7', title: 'New Direction', timestamp: 0.85, emotionalWeight: 0.85, type: 'milestone' }
]
