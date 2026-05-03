export type LifeMapStar = {
  id: string
  memoryRef: string
  depthBand: 'near' | 'mid' | 'far'
  position: [number, number, number]
  size: number
}

export const LIFEMAP_STARS: LifeMapStar[] = [
  { id: 'star-001', memoryRef: 'memory-001', depthBand: 'far',  position: [-14,  9, -42], size: 0.26 },
  { id: 'star-002', memoryRef: 'memory-002', depthBand: 'far',  position: [ 13,  6, -40], size: 0.22 },
  { id: 'star-003', memoryRef: 'memory-003', depthBand: 'far',  position: [ -8, -6, -38], size: 0.20 },
  { id: 'star-004', memoryRef: 'memory-004', depthBand: 'far',  position: [  9, -8, -36], size: 0.24 },

  { id: 'star-005', memoryRef: 'memory-005', depthBand: 'mid',  position: [-10,  5, -24], size: 0.34 },
  { id: 'star-006', memoryRef: 'memory-006', depthBand: 'mid',  position: [ -4, -3, -22], size: 0.30 },
  { id: 'star-007', memoryRef: 'memory-007', depthBand: 'mid',  position: [  4,  2, -20], size: 0.36 },
  { id: 'star-008', memoryRef: 'memory-008', depthBand: 'mid',  position: [ 10, -4, -23], size: 0.32 },

  { id: 'star-009', memoryRef: 'memory-009', depthBand: 'near', position: [ -6,  6, -12], size: 0.52 },
  { id: 'star-010', memoryRef: 'memory-010', depthBand: 'near', position: [  2, -1, -10], size: 0.64 },
  { id: 'star-011', memoryRef: 'memory-011', depthBand: 'near', position: [ 11,  0, -11], size: 0.56 },
]
