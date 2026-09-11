import type { LifeMapNode } from './lifeMapData'

type Point3 = [number, number, number]

export function lifeMapLocalPoint(node: LifeMapNode, index: number): Point3 {
  const [x, y, z] = node.position
  return [x * .92, y * .72 + Math.sin(index * .91) * 1.25, z * 1.06 - 5.5]
}

export function lifeMapStage(selected: boolean, portrait: boolean): { scale: Point3; position: Point3 } {
  return {
    scale: selected ? (portrait ? [1.04, 1.02, 1.04] : [1.08, 1.08, 1.08]) : portrait ? [1.02, 1.02, 1.02] : [1, 1, 1],
    position: selected ? (portrait ? [0, -.08, .58] : [0, -.14, .72]) : portrait ? [0, -.18, .54] : [0, -.14, 1.15],
  }
}

export function lifeMapWorldPoint(node: LifeMapNode, index: number, portrait: boolean): Point3 {
  const local = lifeMapLocalPoint(node, index)
  const stage = lifeMapStage(true, portrait)
  return local.map((value, axis) => value * stage.scale[axis] + stage.position[axis]) as Point3
}
