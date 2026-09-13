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
  // Visible geography authority: chapter masses, scars, cuts and lateral banks
  // must remain legible from overview scale instead of collapsing into a slab.
  const gaussian = (cx: number, cz: number, sx: number, sz: number) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
  const warpX = x + (valueNoise2D(x * .11 + 5.4, z * .09 - 2.7) - .5) * 1.36
  const warpZ = z + (valueNoise2D(x * .08 - 7.2, z * .10 + 4.1) - .5) * 1.82
  const chapterMasses =
    1.75 * gaussian(-6.8, -8.0, 4.0, 5.3)
    + 1.25 * gaussian(-2.0, -14.2, 3.2, 4.4)
    + 1.65 * gaussian(5.4, -20.6, 4.1, 5.5)
    + 1.15 * gaussian(1.6, -29.2, 3.6, 6.1)
    + 1.55 * gaussian(-4.8, -37.0, 4.5, 6.7)
  const outcrops =
    1.05 * gaussian(-8.9, -13.2, 2.0, 3.0)
    + .88 * gaussian(7.7, -25.4, 2.2, 3.4)
    + .80 * gaussian(-6.0, -31.5, 1.9, 3.7)
    + .72 * gaussian(4.4, -8.4, 1.8, 2.7)
    + .58 * gaussian(8.4, -36.2, 2.0, 3.1)
  const livedCuts =
    .98 * gaussian(-2.5, -10.8, 1.6, 3.0)
    + .82 * gaussian(3.0, -24.4, 1.9, 3.4)
    + .70 * gaussian(-.4, -34.0, 1.5, 4.0)
    + .46 * gaussian(-7.1, -20.0, 1.4, 2.8)
  const authoredScars =
    .46 * gaussian(7.2, -10.0, 1.2, 5.2)
    - .44 * gaussian(-7.0, -24.0, 1.4, 5.7)
    + .36 * gaussian(5.8, -33.0, 1.1, 4.2)
  const lateralBanks =
    .62 * gaussian(-10.6, -20.0, 4.2, 17.0)
    + .48 * gaussian(10.1, -25.0, 4.6, 15.0)
  const weathering =
    (valueNoise2D(warpX * .31 + 12.0, warpZ * .29 - 8.0) - .5) * .26
    + (valueNoise2D(warpX * .67 - 3.0, warpZ * .59 + 9.0) - .5) * .125
    + (valueNoise2D(warpX * 1.41 + 2.0, warpZ * 1.23 - 1.0) - .5) * .052
  const deepTime = Math.max(0, Math.min(1, (-z - 3) / 40))
  const valley = .58 * gaussian(.2, -22, 4.0, 20)
  return -4.28
    + chapterMasses * 1.08
    + outcrops
    + lateralBanks
    - livedCuts * .92
    - valley
    + authoredScars
    + weathering
    + deepTime * .34
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
      scale: portrait ? [.98, 1.08, .92] : [1.12, 1.12, 1.06],
      position: portrait ? [0, -.10, 1.36] : [0, -.14, .92],
    }
  }

  // Portrait keeps chronology readable without compressing the world into a
  // runway: widen the authored landscape and reduce excessive Z-depth.
  return portrait
    ? { scale: [.82, 1.08, .86], position: [0, -.46, 2.0] }
    : { scale: [1.24, 1.18, .92], position: [0, -.42, .66] }
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
    ? { position: [0, 23.0, 32.0], target: [0, -4.8, -17.0] }
    : { position: [0, 8.2, 15.0], target: [0, -1.0, -18.0] }

  const min: Point3 = [Infinity, Infinity, Infinity]
  const max: Point3 = [-Infinity, -Infinity, -Infinity]
  for (const point of points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point[axis])
    max[axis] = Math.max(max[axis], point[axis])
  }
  const target = min.map((value, axis) => (value + max[axis]) / 2) as Point3

  if (portrait) {
    const horizontalTan = Math.tan(50 * Math.PI / 360) * Math.max(aspect, .2)
    const halfWidth = Math.max(
      Math.abs(min[0] - target[0]) + 2.35 * stage.scale[0],
      Math.abs(max[0] - target[0]) + 2.35 * stage.scale[0],
    )
    const forward = Math.max(30, halfWidth / (horizontalTan * .82))
    return {
      position: [target[0], target[1] + 23, target[2] + forward],
      target: [target[0], target[1] - .72, target[2] - 1.4],
    }
  }

  const verticalTan = Math.tan(52 * Math.PI / 360)
  const horizontalTan = verticalTan * Math.max(aspect, .2)
  let distance = 8
  for (const point of points) {
    const horizontalFit = (Math.abs(point[0] - target[0]) + 2.35 * stage.scale[0]) / (horizontalTan * .90)
    const verticalFit = (Math.abs(point[1] - target[1]) + 2.35 * stage.scale[1]) / (verticalTan * .76)
    distance = Math.max(distance, Math.max(horizontalFit, verticalFit) + point[2] - target[2] + 2.2 * stage.scale[2])
  }
  return {
    position: [target[0], target[1] + 8.2, target[2] + distance * .92],
    target: [target[0], target[1] - .64, target[2] - 1.8],
  }
}