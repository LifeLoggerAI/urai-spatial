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
  const gaussian = (cx: number, cz: number, sx: number, sz: number) =>
    Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
  const warpX = x + (valueNoise2D(x * .11 + 5.4, z * .09 - 2.7) - .5) * 1.72
  const warpZ = z + (valueNoise2D(x * .08 - 7.2, z * .10 + 4.1) - .5) * 2.16

  const chapterMasses =
    3.20 * gaussian(-7.0, -7.4, 3.35, 4.45)
    + 2.55 * gaussian(-1.8, -13.4, 2.65, 3.75)
    + 3.45 * gaussian(5.6, -20.0, 3.45, 4.55)
    + 2.70 * gaussian(1.3, -28.5, 2.95, 5.05)
    + 3.15 * gaussian(-5.0, -36.4, 3.75, 5.55)

  const outcrops =
    1.55 * gaussian(-9.4, -12.6, 1.55, 2.35)
    + 1.28 * gaussian(8.1, -25.1, 1.75, 2.55)
    + 1.20 * gaussian(-6.5, -31.8, 1.45, 2.85)
    + 1.02 * gaussian(4.8, -8.2, 1.38, 2.15)
    + .92 * gaussian(8.8, -36.0, 1.55, 2.55)
    + .74 * gaussian(-10.3, -22.4, 1.40, 2.90)

  const lateralBanks =
    1.28 * gaussian(-11.0, -18.5, 3.10, 12.5)
    + .96 * gaussian(10.6, -26.4, 3.35, 11.2)
    + .66 * gaussian(-9.0, -37.4, 2.60, 7.2)

  const livedCuts =
    1.55 * gaussian(-2.7, -10.8, 1.22, 2.65)
    + 1.38 * gaussian(3.1, -24.1, 1.42, 3.05)
    + 1.14 * gaussian(-.5, -33.6, 1.18, 3.50)
    + .86 * gaussian(-7.2, -19.8, 1.12, 2.45)
    + .72 * gaussian(6.8, -15.2, 1.00, 2.35)

  const authoredScars =
    .82 * gaussian(7.3, -10.1, .92, 4.50)
    - .76 * gaussian(-7.2, -24.0, 1.08, 5.10)
    + .66 * gaussian(5.8, -33.0, .88, 3.70)
    - .48 * gaussian(1.4, -17.0, .86, 3.40)

  const chapterShelves =
    .58 * gaussian(-4.8, -17.2, 5.2, 2.05)
    - .52 * gaussian(1.4, -17.9, 3.0, 1.55)
    + .62 * gaussian(3.6, -31.0, 4.8, 2.10)
    - .46 * gaussian(-2.4, -30.8, 2.5, 1.55)

  const erosionA = valueNoise2D(warpX * .30 + 12.0, warpZ * .28 - 8.0) - .5
  const erosionB = valueNoise2D(warpX * .69 - 3.0, warpZ * .61 + 9.0) - .5
  const erosionC = valueNoise2D(warpX * 1.53 + 2.0, warpZ * 1.31 - 1.0) - .5
  const weathering = erosionA * .46 + erosionB * .22 + erosionC * .085
  const ravines = Math.max(0, .44 - Math.abs(erosionB)) * .72 * (gaussian(-1.0, -22, 10.5, 20) + .32)
  const deepTime = Math.max(0, Math.min(1, (-z - 3) / 40))
  const chronologyValley = 1.06 * gaussian(.1, -22, 3.35, 18.5)

  return -4.78
    + chapterMasses
    + outcrops
    + lateralBanks
    + chapterShelves
    - livedCuts * 1.08
    - chronologyValley
    - ravines
    + authoredScars
    + weathering
    + deepTime * .44
}

export function lifeMapLocalPoint(node: LifeMapNode, _index: number): Point3 {
  const [x, y, z] = lifeMapDisplayPosition(node)
  const worldZ = z - 3.4
  const narrativeLift = Math.max(-.12, Math.min(.34, y * .08))
  return [x, lifeMapTerrainHeight(x, worldZ) + .62 + narrativeLift, worldZ]
}

export function lifeMapStage(selected: boolean, portrait: boolean): { scale: Point3; position: Point3 } {
  if (selected) {
    // Keep the selected memory intimate without turning it into a giant prop;
    // retain surrounding geography as the spatial context for Focus/Replay.
    return {
      scale: portrait ? [.96, 1.02, .98] : [1.08, 1.10, 1.08],
      position: portrait ? [0, -.72, 1.18] : [0, -.54, .62],
    }
  }

  // V251 literal-pixel repair: preserve horizontal and chronological breadth in
  // portrait instead of compressing the world into a miniature runway. Relief
  // stays natural while a lower camera makes geography, not dead sky, own frame.
  return portrait
    ? { scale: [1.16, 1.34, 1.08], position: [0, -.94, 2.10] }
    : { scale: [1.42, 1.18, 1.02], position: [0, -.82, .74] }
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
    ? { position: [0, 10.8, 24.0], target: [0, -4.1, -17.8] }
    : { position: [0, 5.5, 13.6], target: [0, -1.4, -19.2] }

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
    const forward = Math.max(22, halfWidth / (horizontalTan * .88))
    return {
      position: [target[0], target[1] + 10.8, target[2] + forward],
      target: [target[0], target[1] - 1.02, target[2] - 3.10],
    }
  }

  const verticalTan = Math.tan(52 * Math.PI / 360)
  const horizontalTan = verticalTan * Math.max(aspect, .2)
  let distance = 8
  for (const point of points) {
    const horizontalFit = (Math.abs(point[0] - target[0]) + 2.35 * stage.scale[0]) / (horizontalTan * .82)
    const verticalFit = (Math.abs(point[1] - target[1]) + 2.35 * stage.scale[1]) / (verticalTan * .80)
    distance = Math.max(distance, Math.max(horizontalFit, verticalFit) + point[2] - target[2] + 2.2 * stage.scale[2])
  }
  return {
    position: [target[0], target[1] + 5.6, target[2] + distance],
    target: [target[0], target[1] - .88, target[2] - 3.10],
  }
}
