import type { LifeMapNode } from './lifeMapData'

type Point3 = [number, number, number]

export function lifeMapLocalPoint(node: LifeMapNode, index: number): Point3 {
  const [x, y, z] = node.position
  return [x * .92, y * .72 + Math.sin(index * .91) * 1.25, z * 1.06 - 5.5]
}

export function lifeMapStage(selected: boolean, portrait: boolean): { scale: Point3; position: Point3 } {
  if (selected) {
    return {
      scale: portrait ? [1.04, 1.02, 1.04] : [1.08, 1.08, 1.08],
      position: portrait ? [0, -.08, .58] : [0, -.14, .72],
    }
  }

  // V231 overview composition: the camera looks deep into the life universe, so the
  // overview stage must occupy that full authored depth instead of collapsing the
  // meaningful memories into a narrow ribbon near the front of the frustum.
  // Desktop opens the chapter geography laterally; portrait prioritizes vertical
  // depth while keeping edge landmarks inside the narrow safe frame.
  return portrait
    ? { scale: [.58, 1.65, 1.2], position: [0, -2, -1.5] }
    : { scale: [2.4, 1.8, 1.45], position: [0, -2.3, -3] }
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
  // Include the artifact envelope, not just its center. The previous fixed
  // portrait camera cut off an entire chapter to the left of the viewport.
  let distance = 8
  for (const point of points) {
    const horizontalFit = (Math.abs(point[0] - target[0]) + 2.2 * stage.scale[0]) / (horizontalTan * .88)
    const verticalFit = (Math.abs(point[1] - target[1]) + 2.2 * stage.scale[1]) / (verticalTan * .72)
    distance = Math.max(distance, Math.max(horizontalFit, verticalFit) + point[2] - target[2] + 2.2 * stage.scale[2])
  }
  return { position: [target[0], target[1], target[2] + distance], target }
}
