export type GalaxyQuality = 'low' | 'balanced' | 'ultra'

export interface GalaxySimulationBudget {
  quality: GalaxyQuality
  starCount: number
  linkCount: number
  shaderPasses: number
  useInstancing: boolean
  targetFps: 60
  fallbackReason?: string
}

export function buildGalaxySimulationBudget({
  quality = 'balanced',
  reducedMotion = false,
  deviceMemoryGb,
}: {
  quality?: GalaxyQuality
  reducedMotion?: boolean
  deviceMemoryGb?: number
}): GalaxySimulationBudget {
  if (reducedMotion) {
    return {
      quality: 'low',
      starCount: 80,
      linkCount: 40,
      shaderPasses: 1,
      useInstancing: true,
      targetFps: 60,
      fallbackReason: 'reduced-motion',
    }
  }

  if (typeof deviceMemoryGb === 'number' && deviceMemoryGb < 4) {
    return {
      quality: 'low',
      starCount: 240,
      linkCount: 120,
      shaderPasses: 1,
      useInstancing: true,
      targetFps: 60,
      fallbackReason: 'low-device-memory',
    }
  }

  if (quality === 'ultra') {
    return {
      quality,
      starCount: 3600,
      linkCount: 1200,
      shaderPasses: 4,
      useInstancing: true,
      targetFps: 60,
    }
  }

  if (quality === 'low') {
    return {
      quality,
      starCount: 360,
      linkCount: 160,
      shaderPasses: 1,
      useInstancing: true,
      targetFps: 60,
    }
  }

  return {
    quality,
    starCount: 1400,
    linkCount: 520,
    shaderPasses: 2,
    useInstancing: true,
    targetFps: 60,
  }
}

export function shouldUseGpuGalaxy(budget: GalaxySimulationBudget) {
  return budget.useInstancing && budget.starCount >= 240 && !budget.fallbackReason
}
