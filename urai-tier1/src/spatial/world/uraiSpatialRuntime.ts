import { createAvatarPresenceState, resolveAvatarMotion } from '../avatar/avatarPresenceRenderer'
import { createSpatialCameraState, resolveCameraTransition } from '../camera/spatialCameraRig'
import { createOrbState, resolveOrbLighting } from '../orb/orbState'
import { createGroundAnchor } from '../ground/groundLifeAnchors'
import { resolveMemoryStarAppearance, selectMemoryStar } from '../lifemap/memoryStarRelationships'

export const URAI_SPATIAL_RUNTIME_VERSION = 'urai-spatial-runtime-v1' as const

export function createUraiSpatialRuntime() {
  return {
    version: URAI_SPATIAL_RUNTIME_VERSION,
    avatar: createAvatarPresenceState(),
    camera: createSpatialCameraState(),
    orb: createOrbState(),
  }
}

export const spatialRuntimeAdapters = {
  avatar: resolveAvatarMotion,
  camera: resolveCameraTransition,
  orb: resolveOrbLighting,
  ground: createGroundAnchor,
  memory: {
    appearance: resolveMemoryStarAppearance,
    select: selectMemoryStar,
  },
} as const

export function selectLifeMemoryExperience(star: Parameters<typeof selectMemoryStar>[0]) {
  return {
    star: selectMemoryStar(star),
    camera: 'memoryApproach',
    transition: 'focus-or-replay',
  }
}
