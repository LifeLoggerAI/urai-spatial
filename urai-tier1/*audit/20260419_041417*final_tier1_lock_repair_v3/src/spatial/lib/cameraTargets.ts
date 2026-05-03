
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'
import type { CanonMode } from '@/spatial/contracts/sceneAuthority'
import type { CameraPose, Vec3 } from '@/spatial/canon/cameraCanon'

const HOME_POSITION: Vec3 = [0, 1.34, 11.6]
const HOME_TARGET: Vec3 = [0, 0.88, 0]

const LIFEMAP_POSITION: Vec3 = [0, 0.22, 24.8]
const LIFEMAP_TARGET: Vec3 = [0, 0, -1.2]

function toFocusPose(star: LifeMapStar | null): CameraPose {
  const p = star?.position ?? [0, 0, 0]
  return {
    position: [p[0] * 0.13, p[1] * 0.13 + 0.3, p[2] + 6.35],
    target: [p[0], p[1], p[2]],
    fov: 29,
  }
}

function toReplayPose(star: LifeMapStar | null): CameraPose {
  const p = star?.position ?? [0, 0, 0]
  return {
    position: [p[0] * 0.03, p[1] * 0.03 + 0.1, p[2] + 2.25],
    target: [p[0], p[1], p[2] - 0.75],
    fov: 24,
  }
}

export function getCameraPoseForMode(
  mode: CanonMode,
  selectedStar: LifeMapStar | null
): CameraPose {
  if (mode === 'HOME') {
    return {
      position: HOME_POSITION,
      target: HOME_TARGET,
      fov: 44,
    }
  }

  if (mode === 'LIFEMAP') {
    return {
      position: LIFEMAP_POSITION,
      target: LIFEMAP_TARGET,
      fov: 35,
    }
  }

  if (mode === 'FOCUS') return toFocusPose(selectedStar)
  return toReplayPose(selectedStar)
}
