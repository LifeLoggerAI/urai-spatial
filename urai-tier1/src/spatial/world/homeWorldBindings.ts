import { resolveOrbLighting, createOrbState } from '../orb/orbState'
import { createRelationshipDrivenStar, createConstellation } from '../lifemap/relationshipStarFactory'
import { createGroundWorldObjects } from '../ground/groundAnchorFactory'
import { createSpatialCameraState, resolveCameraTransition } from '../camera/spatialCameraRig'

export function createHomeWorldBindings() {
  const orb = createOrbState()
  const camera = createSpatialCameraState()

  return {
    contract: 'urai-spatial-runtime-v1',
    orb: resolveOrbLighting(orb),
    camera: resolveCameraTransition(camera),
    stars: {
      source: 'relationshipStarFactory',
      create: createRelationshipDrivenStar,
      connect: createConstellation,
    },
    ground: {
      source: 'groundAnchorFactory',
      create: createGroundWorldObjects,
    },
  }
}
