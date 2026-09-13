import type { LifeMapNode } from './lifeMapData'
import { lifeMapDisplayPosition } from './lifeMapLayout'

type Point3 = [number, number, number]

export function lifeMapTerrainHeight(x: number, z: number): number {
  // V256 visible geography authority: asymmetric chapter landforms, cuts, and
  // outcrops replace the prior longitudinal terrain field that read as smooth
  // repeated ridges in exact-head retained pixels.
  const gaussian = (cx: number, cz: number, sx: number, sz: number) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
  const warpX = x + .58 * Math.sin(z * .17) - .24 * Math.sin(z * .41)
  const warpZ = z + .72 * Math.sin(x * .19)
  const chapterMasses =
    1.28 * gaussian(-6.8, -8.0, 4.2, 5.8)
    + .82 * gaussian(-2.0, -14.2, 3.5, 4.8)
    + 1.18 * gaussian(5.4, -20.6, 4.4, 6.0)
    + .72 * gaussian(1.6, -29.2, 3.9, 6.8)
    + 1.06 * gaussian(-4.8, -37.0, 4.8, 7.4)
  const outcrops =
    .64 * gaussian(-8.9, -13.2, 2.2, 3.3)
    + .52 * gaussian(7.7, -25.4, 2.5, 3.8)
    + .44 * gaussian(-6.0, -31.5, 2.1, 4.2)
    + .38 * gaussian(4.4, -8.4, 2.0, 3.0)
  const livedCuts =
    .74 * gaussian(-2.5, -10.8, 1.8, 3.4)
    + .58 * gaussian(3.0, -24.4, 2.1, 3.8)
    + .42 * gaussian(-.4, -34.0, 1.7, 4.5)
  const weathering =
    .16 * Math.sin(warpX * .73 + warpZ * .19) * Math.cos(warpZ * .31 - warpX * .43)
    + .09 * Math.sin(warpX * 1.47 - warpZ * .63)
    + .055 * Math.cos(warpX * 2.91 + warpZ * 1.17)
    + .025 * Math.sin(warpX * 5.2 - warpZ * 2.4)
  const deepTime = Math.max(0, Math.min(1, (-z - 3) / 40))
  const valley = .34 * gaussian(.2, -22, 5.4, 21)
  return -4.32
    + chapterMasses * .74
    + outcrops
    - livedCuts * .62
    - valley
    + weathering
    + deepTime * .24
}

export function lifeMapLocalPoint(node: LifeMapNode, _index: number): Point3 {
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

  // Portrait is a deliberately composed world view, not a desktop fit squeezed
  // to half-width. Keep chapter silhouettes large enough to read by shape.
  return portrait
    ? { scale: [.58, 1.02, 1.18], position: [0, -.68, .72] }
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
  if (!points.length) return portrait
    ? { position: [0, 25.2, 35.0], target: [0, -4.9, -20.0] }
    : { position: [0, 7.0, 18.2], target: [0, -1.0, -18] }

  const min: Point3 = [Infinity, Infinity, Infinity]
  const max: Point3 = [-Infinity, -Infinity, -Infinity]
  for (const point of points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point[axis])
    max[axis] = Math.max(max[axis], point[axis])
  }
  const target = min.map((value, axis) => (value + max[axis]) / 2) as Point3

  if (portrait) {
    // The narrow viewport is composed as a downward-looking chronology: the
    // full semantic envelope remains uncropped while near-to-deep-time terrain
    // occupies the screen vertically instead of collapsing beneath dead sky.
    const horizontalTan = Math.tan(50 * Math.PI / 360) * Math.max(aspect, .2)
    const halfWidth = Math.max(
      Math.abs(min[0] - target[0]) + 2.2 * stage.scale[0],
      Math.abs(max[0] - target[0]) + 2.2 * stage.scale[0],
    )
    const forward = Math.max(55, halfWidth / (horizontalTan * .78))
    return {
      position: [target[0], target[1] + 30, target[2] + forward],
      target: [target[0], target[1] - .48, target[2] - 5.5],
    }
  }

  const verticalTan = Math.tan(52 * Math.PI / 360)
  const horizontalTan = verticalTan * Math.max(aspect, .2)
  let distance = 8
  for (const point of points) {
    const horizontalFit = (Math.abs(point[0] - target[0]) + 2.2 * stage.scale[0]) / (horizontalTan * .88)
    const verticalFit = (Math.abs(point[1] - target[1]) + 2.2 * stage.scale[1]) / (verticalTan * .72)
    distance = Math.max(distance, Math.max(horizontalFit, verticalFit) + point[2] - target[2] + 2.2 * stage.scale[2])
  }
  return {
    position: [target[0], target[1] + 7.1, target[2] + distance * 1.14],
    target: [target[0], target[1] - .65, target[2] - 1.2],
  }
}
