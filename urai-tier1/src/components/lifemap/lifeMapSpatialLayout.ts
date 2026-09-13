import type { LifeMapNode } from './lifeMapData'
import { lifeMapDisplayPosition } from './lifeMapLayout'

type Point3 = [number, number, number]

function hash2(x: number, z: number): number {
  const value = Math.sin(x * 127.1 + z * 311.7 + 17.13) * 43758.5453123
  return value - Math.floor(value)
}

function smoothCell(value: number): number {
  return value * value * (3 - 2 * value)
}

function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = smoothCell(x - ix)
  const fz = smoothCell(z - iz)
  const a = hash2(ix, iz)
  const b = hash2(ix + 1, iz)
  const c = hash2(ix, iz + 1)
  const d = hash2(ix + 1, iz + 1)
  const near = THREE_LERP(a, b, fx)
  const far = THREE_LERP(c, d, fx)
  return THREE_LERP(near, far, fz)
}

function THREE_LERP(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lifeMapTerrainHeight(x: number, z: number): number {
  // Visible geography authority: hand-placed chapter landforms, scars, and
  // outcrops own the silhouette. Non-periodic detail only weathers those forms.
  const gaussian = (cx: number, cz: number, sx: number, sz: number) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
  const warpX = x + (valueNoise2D(x * .11 + 5.4, z * .09 - 2.7) - .5) * 1.36
  const warpZ = z + (valueNoise2D(x * .08 - 7.2, z * .10 + 4.1) - .5) * 1.82
  const chapterMasses =
    1.42 * gaussian(-6.8, -8.0, 4.0, 5.3)
    + .96 * gaussian(-2.0, -14.2, 3.2, 4.4)
    + 1.34 * gaussian(5.4, -20.6, 4.1, 5.5)
    + .88 * gaussian(1.6, -29.2, 3.6, 6.1)
    + 1.24 * gaussian(-4.8, -37.0, 4.5, 6.7)
  const outcrops =
    .78 * gaussian(-8.9, -13.2, 2.0, 3.0)
    + .66 * gaussian(7.7, -25.4, 2.2, 3.4)
    + .58 * gaussian(-6.0, -31.5, 1.9, 3.7)
    + .50 * gaussian(4.4, -8.4, 1.8, 2.7)
    + .36 * gaussian(8.4, -36.2, 2.0, 3.1)
  const livedCuts =
    .88 * gaussian(-2.5, -10.8, 1.6, 3.0)
    + .72 * gaussian(3.0, -24.4, 1.9, 3.4)
    + .56 * gaussian(-.4, -34.0, 1.5, 4.0)
    + .34 * gaussian(-7.1, -20.0, 1.4, 2.8)
  const authoredScars =
    .30 * gaussian(7.2, -10.0, 1.2, 5.2)
    - .28 * gaussian(-7.0, -24.0, 1.4, 5.7)
    + .22 * gaussian(5.8, -33.0, 1.1, 4.2)
  const weathering =
    (valueNoise2D(warpX * .31 + 12.0, warpZ * .29 - 8.0) - .5) * .22
    + (valueNoise2D(warpX * .67 - 3.0, warpZ * .59 + 9.0) - .5) * .105
    + (valueNoise2D(warpX * 1.41 + 2.0, warpZ * 1.23 - 1.0) - .5) * .040
  const deepTime = Math.max(0, Math.min(1, (-z - 3) / 40))
  const valley = .28 * gaussian(.2, -22, 5.0, 20)
  return -4.28
    + chapterMasses * .90
    + outcrops
    - livedCuts * .74
    - valley
    + authoredScars
    + weathering
    + deepTime * .28
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

  // Portrait keeps the authored chronology deep while the camera, rather than
  // scene shrinkage, composes the full semantic envelope into the viewport.
  return portrait
    ? { scale: [.58, 1.02, 1.18], position: [0, -.54, 1.18] }
    : { scale: [1.18, 1.12, 1], position: [0, -.42, .36] }
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
    ? { position: [0, 31.0, 43.0], target: [0, -5.5, -18.0] }
    : { position: [0, 9.6, 16.4], target: [0, -1.2, -18.8] }

  const min: Point3 = [Infinity, Infinity, Infinity]
  const max: Point3 = [-Infinity, -Infinity, -Infinity]
  for (const point of points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point[axis])
    max[axis] = Math.max(max[axis], point[axis])
  }
  const target = min.map((value, axis) => (value + max[axis]) / 2) as Point3

  if (portrait) {
    // The full 2.2-unit semantic artifact envelope remains in frame, but the
    // minimum stand-off no longer forces the world beneath a wall of dead sky.
    const horizontalTan = Math.tan(50 * Math.PI / 360) * Math.max(aspect, .2)
    const halfWidth = Math.max(
      Math.abs(min[0] - target[0]) + 2.2 * stage.scale[0],
      Math.abs(max[0] - target[0]) + 2.2 * stage.scale[0],
    )
    const forward = Math.max(39, halfWidth / (horizontalTan * .78))
    return {
      position: [target[0], target[1] + 31, target[2] + forward],
      target: [target[0], target[1] - 1.10, target[2] - 2.2],
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
    position: [target[0], target[1] + 9.6, target[2] + distance * 1.02],
    target: [target[0], target[1] - .88, target[2] - 2.4],
  }
}
