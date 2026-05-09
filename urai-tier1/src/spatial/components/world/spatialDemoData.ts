export type SpatialEmotion = 'calm' | 'threshold' | 'recovery' | 'wonder' | 'focus' | 'becoming'

export type SpatialMemory = {
  id: string
  title: string
  emotion: SpatialEmotion
  archetype: string
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' | 'Threshold'
  intensity: number
  timestamp: string
  position: readonly [number, number, number]
  colorToken: string
  replayText: string
  relatedMemoryIds: readonly string[]
}

export type SpatialWorldDataset = {
  label: string
  source: 'local-demo'
  memories: readonly SpatialMemory[]
}

export const URAI_SPATIAL_DEMO_DATA: SpatialWorldDataset = {
  label: 'Local demo memory constellation',
  source: 'local-demo',
  memories: [
    {
      id: 'first-signal',
      title: 'First Signal',
      emotion: 'focus',
      archetype: 'Observer',
      season: 'Spring',
      intensity: 0.62,
      timestamp: '2026-03-01T10:00:00.000Z',
      position: [-4.4, 1.7, -2.2],
      colorToken: '#7dd3fc',
      replayText: 'A small signal became visible before the larger pattern had language.',
      relatedMemoryIds: ['threshold-pulse', 'quiet-return'],
    },
    {
      id: 'threshold-pulse',
      title: 'Threshold Pulse',
      emotion: 'threshold',
      archetype: 'Gatekeeper',
      season: 'Threshold',
      intensity: 0.92,
      timestamp: '2026-03-08T20:14:00.000Z',
      position: [-1.45, 2.65, -4.6],
      colorToken: '#c084fc',
      replayText: 'The constellation gathers around a visible turning point.',
      relatedMemoryIds: ['first-signal', 'recovery-bloom', 'mirror-moment'],
    },
    {
      id: 'recovery-bloom',
      title: 'Recovery Bloom',
      emotion: 'recovery',
      archetype: 'Healer',
      season: 'Spring',
      intensity: 0.84,
      timestamp: '2026-03-15T08:30:00.000Z',
      position: [1.7, 1.35, 2.9],
      colorToken: '#86efac',
      replayText: 'A softer arc becomes visible in the garden field.',
      relatedMemoryIds: ['threshold-pulse', 'quiet-return'],
    },
    {
      id: 'dream-garden',
      title: 'Dream Garden',
      emotion: 'wonder',
      archetype: 'Dreamer',
      season: 'Summer',
      intensity: 0.76,
      timestamp: '2026-03-22T22:12:00.000Z',
      position: [4.25, 2.1, -1.15],
      colorToken: '#f0abfc',
      replayText: 'Symbolic fragments arrange themselves like a garden in low light.',
      relatedMemoryIds: ['mirror-moment', 'recovery-bloom'],
    },
    {
      id: 'quiet-return',
      title: 'Quiet Return',
      emotion: 'calm',
      archetype: 'Restorer',
      season: 'Autumn',
      intensity: 0.55,
      timestamp: '2026-03-29T06:45:00.000Z',
      position: [-3.1, 0.95, 2.6],
      colorToken: '#bae6fd',
      replayText: 'The scene settles into a simple, steady rhythm.',
      relatedMemoryIds: ['first-signal', 'recovery-bloom'],
    },
    {
      id: 'mirror-moment',
      title: 'Mirror Moment',
      emotion: 'becoming',
      archetype: 'Mirror',
      season: 'Winter',
      intensity: 0.88,
      timestamp: '2026-04-04T18:20:00.000Z',
      position: [3.35, 1.55, 3.6],
      colorToken: '#93c5fd',
      replayText: 'The map reflects a clear pattern of becoming.',
      relatedMemoryIds: ['threshold-pulse', 'dream-garden'],
    },
  ],
}
