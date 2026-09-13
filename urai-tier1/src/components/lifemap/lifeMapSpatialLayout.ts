import type { LifeMapNode } from './lifeMapData'
import { lifeMapDisplayPosition } from './lifeMapLayout'

type Point3 = [number, number, number]

export function lifeMapTerrainHeight(x: number, z: number): number {
  // V255 visible geography authority: broad chapter masses and erosion replace
  // the repeated terrace bands that made the Life Map read as a generated height field.
  const route = .48 * Math.sin((z + 4.5) * .14) + .14 * Math.sin(z * .43)
  const distanceFromRoute = Math.abs(x - route)
  const shoulder = Math.max(0, distanceFromRoute - 2.45)
  const deepTime = Math.max(0, Math.min(1, (-z - 1) / 42))
  const gaussian = (cx: number, cz: number, sx: number, sz: number) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
  const chapterMasses =
    .92 * gaussian(-6.0, -7.5, 5.6, 7.2)
    + .66 * gaussian(-1.8, -13.8, 4.4, 6.0)
    + .78 * gaussian(5.2, -20.0, 5.8, 7.8)
    + .58 * gaussian(1.7, -29.0, 5.0, 8.4)
    + .72 * gaussian(-4.2, -36.0, 6.2, 8.8)
  const livedCuts =
    .46 * gaussian(-2.0, -10.5, 2.3, 3.7)
    + .34 * gaussian(3.2, -24.0, 2.8, 4.2)
  const erosion =
    .18 * Math.sin(x * .61 + z * .23) * Math.cos(z * .17 - x * .39)
    + .08 * Math.sin(x * 1.91 - z * .57)
    + .045 * Math.cos(x * 3.7 + z * 1.31)
  const farRise = deepTime * .44
  return -4.2
    + shoulder * (.30 + deepTime * .20)
    + chapterMasses * .58
    - livedCuts * .36
    + erosion
    + farRise
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
    ? { scale: [.78, .90, .88], position: [0, -.68, .72] }
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
    ? { position: [0, 6.3, 22.5], target: [0, -1.0, -15.5] }
    : { position: [0, 7.0, 18.2], target: [0, -1.0, -18] }

  const min: Point3 = [Infinity, Infinity, Infinity]
  const max: Point3 = [-Infinity, -Infinity, -Infinity]
  for (const point of points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point[axis])
    max[axis] = Math.max(max[axis], point[axis])
  }
  const target = min.map((value, axis) => (value + max[axis]) / 2) as Point3
  const verticalTan = Math.tan((portrait ? 50 : 52) * Math.PI / 360)
  const horizontalTan = verticalTan * Math.max(aspect, .2)

  // Fit the full 2.2-unit artifact envelope required by the production framing
  // contract. Portrait density comes from the larger authored stage, not from
  // cropping semantic memories offscreen.
  let distance = 8
  for (const point of points) {
    const horizontalFit = (Math.abs(point[0] - target[0]) + 2.2 * stage.scale[0]) / (horizontalTan * .88)
    const verticalFit = (Math.abs(point[1] - target[1]) + 2.2 * stage.scale[1]) / (verticalTan * .72)
    distance = Math.max(distance, Math.max(horizontalFit, verticalFit) + point[2] - target[2] + 2.2 * stage.scale[2])
  }

  const overlook = portrait ? 5.35 : 7.1
  const depthAim = portrait ? 1.75 : 1.2
  return {
    position: [target[0], target[1] + overlook, target[2] + distance * (portrait ? 1.10 : 1.14)],
    target: [target[0], target[1] - .65, target[2] - depthAim],
  }
}
