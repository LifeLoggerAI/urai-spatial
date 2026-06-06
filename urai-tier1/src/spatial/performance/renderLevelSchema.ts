export type SpatialRenderLevel = 1 | 2 | 3 | 4 | 5

export type SpatialRenderLevelProfile = {
  level: SpatialRenderLevel
  label: string
  particles: boolean
  bloom: boolean
  fog: boolean
  reflections: boolean
  maxStars: number
  maxObjects: number
  fallbackRoute?: string
}

export const RENDER_LEVEL_PROFILES: Record<SpatialRenderLevel, SpatialRenderLevelProfile> = {
  5: { level: 5, label: 'Full 3D', particles: true, bloom: true, fog: true, reflections: true, maxStars: 240, maxObjects: 80 },
  4: { level: 4, label: 'High 3D', particles: true, bloom: true, fog: true, reflections: false, maxStars: 160, maxObjects: 60 },
  3: { level: 3, label: 'Medium 3D', particles: true, bloom: false, fog: true, reflections: false, maxStars: 100, maxObjects: 40 },
  2: { level: 2, label: 'Low 3D', particles: false, bloom: false, fog: true, reflections: false, maxStars: 60, maxObjects: 24 },
  1: { level: 1, label: 'Fallback', particles: false, bloom: false, fog: false, reflections: false, maxStars: 24, maxObjects: 12, fallbackRoute: '/spatial-fallback' },
}

export function getRenderLevelProfile(level: SpatialRenderLevel) {
  return RENDER_LEVEL_PROFILES[level]
}

export function chooseRenderLevel(input: { webglAvailable: boolean; reducedMotion: boolean; lowPowerMode: boolean }): SpatialRenderLevel {
  if (!input.webglAvailable) return 1
  if (input.lowPowerMode || input.reducedMotion) return 2
  return 5
}
