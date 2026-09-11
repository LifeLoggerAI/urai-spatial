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
