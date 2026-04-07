export type StarTone = '#88ccff' | '#ffaa88' | '#aaffcc' | '#ffd700'

export interface StarRecord {
  id: string
  title: string
  memoryRef: string
  position: [number, number, number]
  size: number
  color: StarTone
  intensity: number
  chapter: string
}

export const STAR_DATA: StarRecord[] = [
  {
    id: 'star-001',
    title: 'Origin Point',
    memoryRef: 'memory-origin-point',
    position: [0.6, 0.2, -8],
    size: 0.06,
    color: '#88ccff',
    intensity: 0.9,
    chapter: 'origins',
  },
  {
    id: 'star-002',
    title: 'Threshold Event',
    memoryRef: 'memory-threshold-event',
    position: [-1.8, 1.1, -11],
    size: 0.055,
    color: '#ffaa88',
    intensity: 0.8,
    chapter: 'thresholds',
  },
  {
    id: 'star-003',
    title: 'Shift in Direction',
    memoryRef: 'memory-shift-direction',
    position: [2.4, -0.9, -14],
    size: 0.05,
    color: '#aaffcc',
    intensity: 0.72,
    chapter: 'transitions',
  },
  {
    id: 'star-004',
    title: 'High Signal Memory',
    memoryRef: 'memory-high-signal',
    position: [-3.2, 1.6, -18],
    size: 0.07,
    color: '#ffd700',
    intensity: 1.0,
    chapter: 'milestones',
  },
  {
    id: 'star-005',
    title: 'Quiet Chapter',
    memoryRef: 'memory-quiet-chapter',
    position: [1.1, -1.5, -21],
    size: 0.045,
    color: '#88ccff',
    intensity: 0.65,
    chapter: 'reflection',
  },
  {
    id: 'star-006',
    title: 'Recovery Marker',
    memoryRef: 'memory-recovery-marker',
    position: [-0.7, 2.0, -25],
    size: 0.058,
    color: '#aaffcc',
    intensity: 0.84,
    chapter: 'recovery',
  },
  {
    id: 'star-007',
    title: 'Relationship Echo',
    memoryRef: 'memory-relationship-echo',
    position: [3.3, 0.4, -29],
    size: 0.052,
    color: '#ffaa88',
    intensity: 0.77,
    chapter: 'social',
  },
  {
    id: 'star-008',
    title: 'Deep Archive',
    memoryRef: 'memory-deep-archive',
    position: [-2.7, -1.3, -33],
    size: 0.05,
    color: '#ffd700',
    intensity: 0.7,
    chapter: 'archive',
  },
]


export type { LifeMapStar, LifeMapStarInput, Vec3 } from '@/lib/uraiCanon/lifemapStar'
