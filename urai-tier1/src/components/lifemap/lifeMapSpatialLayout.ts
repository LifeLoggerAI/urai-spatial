import type { LifeMapNode } from './lifeMapData'
import { lifeMapDisplayPosition } from './lifeMapLayout'

type Point3 = [number, number, number]

export function lifeMapTerrainHeight(x: number, z: number): number {
  // Keep interaction, camera framing, and the visible geography on one height
  // authority. This is deliberately identical to memoryValleyHeight in the
  // rendered world rather than a second approximation that can float nodes.
  const distanceFromPath = Math.abs(x - (.58 * Math.sin((z + 5.5) * .17) + .18 * Math.sin(z * .51)))
  const shoulder = Math.max(0, distanceFromPath - 2.7)
  const deepTime = Math.max(0, Math.min(1, (-z - 2) / 39))
  const weathering = .34 * Math.sin(x * .52 + z * .29) * Math.cos(z * .23 - x * .31)
    + .13 * Math.sin(x * 1.67 - z * .83)
    + .08 * Math.cos(x * 3.1 + z * 1.94)
  const terraces = .24 * Math.tanh(Math.sin(z * .43 + x * .11) * 2.4)
  return -4.15 + shoulder * (.36 + deepTime * .22) + weathering + terraces + deepTime * .58
}

export function lifeMapLocalPoint(node: LifeMapNode, _index: number): Point3 {
  // The semantic memory graph already owns an authored five-band geography.
  // Use that authority directly instead of re-projecting the retired shallow
  // coordinate field into a ribbon. The -3.4 offset keeps authored chapter
  // centers aligned with the production territory landmarks.
  const [x, y, z] = lifeMapDisplayPosition(node)
  const worldZ = z - 3.4
  const narrativeLift = Math.max(-.12, Math.min(.34, y * .08))
  return [x, lifeMapTerrainHeight(x, worldZ) + .58 + narrativeLift, worldZ]
}

export function lifeMapStage(selected: boolean, portrait: boolean): { scale: Point3; position: Point3 } {
  if (selected) {
    return {
      scale: portrait ? [1.04, 1.02, 1.04] : [1.08, 1.08, 1.08],
      position: portrait ? [0, -.08, .58] : [0, -.14, .72],
    }
  }

  // Overview geography is authored in five depth bands. Projection only
  // applies a gentle portrait compression; it must not manufacture composition
  // by stretching memories into a wide ribbon.
  return portrait
    ? { scale: [.46, .82, .92], position: [0, -.42, .3] }
    : { scale: [1.18, 1.12, 1], position: [0, -.55, 0] }
}

export function lifeMapWorldPoint(node: LifeMapNode, index: number, portrait: boolean): Point3 {
  const local = lifeMapLocalPoint(node, index)
  const stage = lifeMapStage(true, portrait)
  return local.map((value, axis) => value * stage.scale[axis] + stage.position[axis]) as Point3
}

export function lifeMapOverviewCamera(nodes: LifeMapNode[], portrait: boolean, aspect: number): { position: Point3; target: Point3 } {
  const stage = lifeMapStage(false, portrait)
  const points = nodes.map((node, index) => lifeMapLocalPoint(node, index).map((value, axis) => value * stage.scale[axis] + stage.position[axis]) as Point3)
    .filter(point => point.every(Number.isFinite))
  if (!points.length) return { position: [0, 6.2, 18.5], target: [0, -.9, -18] }
  const min: Point3 = [Infinity, Infinity, Infinity], max: Point3 = [-Infinity, -Infinity, -Infinity]
  for (const point of points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point[axis]); max[axis] = Math.max(max[axis], point[axis])
  }
  const target = min.map((value, axis) => (value + max[axis]) / 2) as Point3
  const verticalTan = Math.tan((portrait ? 50 : 52) * Math.PI / 360)
  const horizontalTan = verticalTan * Math.max(aspect, .2)
  // Include the artifact envelope, not just its center, so portrait fitting
  // retains every chapter while preserving the authored near/deep ordering.
  let distance = 8
  for (const point of points) {
    const horizontalFit = (Math.abs(point[0] - target[0]) + 2.2 * stage.scale[0]) / (horizontalTan * .88)
    const verticalFit = (Math.abs(point[1] - target[1]) + 2.2 * stage.scale[1]) / (verticalTan * .72)
    distance = Math.max(distance, Math.max(horizontalFit, verticalFit) + point[2] - target[2] + 2.2 * stage.scale[2])
  }
  // A level camera turned the terrain into edge-on black ribbons. The elevated
  // overlook keeps the authored route, contact points, and depth bands legible
  // without flattening the world into an infographic.
  const overlook = portrait ? 5.2 : 7.1
  return { position: [target[0], target[1] + overlook, target[2] + distance * 1.14], target: [target[0], target[1] - .65, target[2] - 1.2] }
}
