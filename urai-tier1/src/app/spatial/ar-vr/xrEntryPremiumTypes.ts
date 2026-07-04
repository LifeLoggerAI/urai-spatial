import type * as THREE from 'three'
import type { OrbParts } from './xrEntryLivingOrb'

export type PremiumEnvironment = OrbParts & {
  floor: THREE.Mesh
  sky: THREE.Mesh
  stars: THREE.Points
  motes: THREE.Points
  glowRings: THREE.Mesh[]
  accentLights: THREE.PointLight[]
}
