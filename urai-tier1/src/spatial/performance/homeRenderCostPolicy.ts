import type { SpatialQualityProfile } from './useAdaptiveSpatialQuality'

const STARTUP_GRACE_MS = 1000
const SLOW_FRAME_MS = 50
const CONSECUTIVE_SLOW_FRAMES = 8

type FrameConditions = { ready: boolean; visible: boolean; continuous: boolean }

// Render cadence is observed locally. Startup compilation, hidden-tab pauses and
// reduced-motion demand frames do not describe continuous rendering performance.
export function createHomeRenderCostMonitor() {
  let previous: number | null = null
  let readySince: number | null = null
  let consecutiveSlow = 0
  let downgraded = false
  const reset = () => { previous = null; readySince = null; consecutiveSlow = 0 }
  return {
    reset,
    observe(now: number, conditions: FrameConditions) {
      if (downgraded) return false
      if (!Number.isFinite(now) || !conditions.ready || !conditions.visible || !conditions.continuous) {
        reset()
        return false
      }
      if (readySince === null || previous === null || now <= previous) {
        readySince = now
        previous = now
        consecutiveSlow = 0
        return false
      }
      const interval = now - previous
      previous = now
      if (now - readySince < STARTUP_GRACE_MS) return false
      consecutiveSlow = interval > SLOW_FRAME_MS ? consecutiveSlow + 1 : 0
      if (consecutiveSlow < CONSECUTIVE_SLOW_FRAMES) return false
      downgraded = true
      return true
    },
  }
}

export function resolveHomeRenderQuality(quality: SpatialQualityProfile, measuredSlow: boolean): SpatialQualityProfile {
  if (!measuredSlow) return quality
  // Use the existing low-tier rendering limits without remounting the world or
  // stopping ordinary animations. MSAA is fixed when the WebGL context is created,
  // so retain its actual setting rather than claiming a live antialias change.
  return { ...quality, tier: 'low', pixelRatioMax: 1, particleCount: Math.min(quality.particleCount, 120),
    shadows: false, postprocessing: false, preloadSecondaryWorlds: false }
}
