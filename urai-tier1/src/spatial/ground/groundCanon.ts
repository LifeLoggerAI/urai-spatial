import * as THREE from 'three'
import type { MovementObstacle } from '@/spatial/navigation/EmbodiedNavigation'

export const GROUND_EYE_HEIGHT_M = 1.69
export const GROUND_LANDSCAPE_FOV_DEG = 58
export const GROUND_PORTRAIT_FOV_DEG = 66
export const GROUND_NEAR_PLANE_M = 0.08
export const GROUND_DESKTOP_SPEED_MPS = 2.0
export const GROUND_MOBILE_SPEED_MPS = 1.8
export const GROUND_VR_SPEED_MPS = 1.6
export const GROUND_PRECISION_SPEED_MPS = 1.15
export const GROUND_ACCELERATION_MPS2 = 6.5
export const GROUND_DECELERATION_MPS2 = 8.0
export const GROUND_ARRIVAL_RADIUS_M = 0.32
export const GROUND_PLAYER_RADIUS_M = 0.28

export const GROUND_ORB = {
  widthM: 0.48,
  centerHeightM: 0.8,
  preferredDistanceM: 2.4,
  minimumDistanceM: 1.25,
  maximumIdleDistanceM: 4.0,
  catchupDistanceM: 4.5,
  preferredBearingDeg: 30,
  centerExclusionDeg: 8,
  decisionHz: 3,
  normalSpeedMps: 1.1,
  catchupSpeedMps: 2.3,
  accelerationMps2: 3.8,
  followDelayMs: 700,
  idleVerticalM: 0.008,
  breathScale: 0.008,
  attentionDistanceM: 1.5,
  attentionGazeMs: 900,
  affordanceGazeMs: 1500,
  attentionLuminanceBoost: 0.1,
} as const

export type GroundWeatherVector = {
  skyLuminance: number
  directWarmth: number
  ambientCoolness: number
  cloudCoverage: number
  horizonClarity: number
  windMean: number
  windVariance: number
  atmosphericDensity: number
  movementEnergy: number
  shadowDefinition: number
  orbCoherence: number
}

export const DEFAULT_GROUND_WEATHER: GroundWeatherVector = {
  skyLuminance: 0.58,
  directWarmth: 0.54,
  ambientCoolness: 0.46,
  cloudCoverage: 0.34,
  horizonClarity: 0.68,
  windMean: 0.24,
  windVariance: 0.2,
  atmosphericDensity: 0.26,
  movementEnergy: 0.32,
  shadowDefinition: 0.6,
  orbCoherence: 0.72,
}

export function clampWeatherVector(vector: Partial<GroundWeatherVector>): GroundWeatherVector {
  const next = { ...DEFAULT_GROUND_WEATHER, ...vector }
  for (const key of Object.keys(next) as (keyof GroundWeatherVector)[]) {
    next[key] = THREE.MathUtils.clamp(next[key], 0, 1)
  }
  return next
}

export function slopeDegrees(heightAt: (x: number, z: number) => number, x: number, z: number) {
  const step = 0.22
  const dx = (heightAt(x + step, z) - heightAt(x - step, z)) / (step * 2)
  const dz = (heightAt(x, z + step) - heightAt(x, z - step)) / (step * 2)
  return THREE.MathUtils.radToDeg(Math.atan(Math.hypot(dx, dz)))
}

export function slopeSpeedMultiplier(degrees: number) {
  if (degrees <= 18) return 1
  if (degrees <= 28) return THREE.MathUtils.lerp(1, 0.75, (degrees - 18) / 10)
  if (degrees <= 36) return THREE.MathUtils.lerp(0.75, 0.35, (degrees - 28) / 8)
  return 0
}

export function collisionRadiusForScale(scale: number, kind: 'tree' | 'rock') {
  const visibleRadius = kind === 'tree' ? 0.24 * scale : 0.62 * scale
  return Math.max(GROUND_PLAYER_RADIUS_M, visibleRadius - 0.1 + GROUND_PLAYER_RADIUS_M)
}

export function buildGroundObstacleField(profile: 'temperate' | 'urban' | 'woodland' | 'arid' | 'coastal'): MovementObstacle[] {
  const items = Array.from({ length: profile === 'urban' ? 18 : 26 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const lane = 7.5 + (index % 7) * 2.7
    const x = side * lane + Math.sin(index * 1.71) * 2.4
    const z = 6 - index * 1.95 + Math.cos(index * 0.83) * 2.6
    const scale = 0.72 + (index % 5) * 0.13
    return { x, z, scale, index }
  })

  if (profile === 'urban') return []
  if (profile === 'arid') return items.slice(0, 12).map((item) => ({
    x: item.x,
    z: item.z,
    radius: collisionRadiusForScale(2.2 * item.scale, 'rock'),
  }))
  if (profile === 'coastal') return items.slice(0, 10).map((item) => ({
    x: item.x,
    z: item.z,
    radius: collisionRadiusForScale(1.25 * item.scale, 'rock'),
  }))

  const woodland = profile === 'woodland'
  const treeObstacles = items.slice(0, woodland ? 18 : 12).map((item) => ({
    x: item.x,
    z: item.z,
    radius: collisionRadiusForScale(1 + item.scale * 0.38, 'tree'),
  }))
  const rockObstacles = items.slice(0, 8).map((item) => ({
    x: item.x * 0.55,
    z: item.z + 2.2,
    radius: collisionRadiusForScale(0.82 * item.scale, 'rock'),
  }))
  return [...treeObstacles, ...rockObstacles]
}
