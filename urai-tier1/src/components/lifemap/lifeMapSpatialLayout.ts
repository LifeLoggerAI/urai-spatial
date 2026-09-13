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

// Memory identity is celestial. The authored terrain remains a lower historical
// stratum, but memory stars are no longer projected onto that terrain. Each
// chapter occupies genuine x/y/z volume with deterministic irregularity so the
// overview reads as an explorable personal cosmos rather than a node graph laid
// across a valley.
export function lifeMapLocalPoint(node: LifeMapNode, index: number): Point3 {
  const [x, y, z] = lifeMapDisplayPosition(node)
  const jitterX = (hash2(index + x * .37, z * .19 + 3.1) - .5) * 3.8
  const jitterY = (hash2(index * .73 + y * .29, x * .41 - 1.7) - .5) * 5.4
  const jitterZ = (hash2(index * 1.13 + z * .17, y * .53 + 7.9) - .5) * 9.0
  return [
    x * 1.72 + jitterX,
    y * 1.34 + jitterY + 1.8,
    z * 1.82 - 8.0 + jitterZ,
  ]
}

export function lifeMapStage(selected: boolean, portrait: boolean): { scale: Point3; position: Point3 } {
  if (selected) {
    return {
      scale: portrait ? [.92, .92, .92] : [1, 1, 1],
      position: portrait ? [0, -.15, .55] : [0, 0, .25],
    }
  }

  return portrait
    ? { scale: [.92, .92, .92], position: [0, -.2, 1.0] }
    : { scale: [1, 1, 1], position: [0, 0, .4] }
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
    ? { position: [0, 4.8, 31], target: [0, 0, -31] }
    : { position: [0, 3.2, 24], target: [0, 0, -34] }

  const min: Point3 = [Infinity, Infinity, Infinity]
  const max: Point3 = [-Infinity, -Infinity, -Infinity]
  for (const point of points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point[axis])
    max[axis] = Math.max(max[axis], point[axis])
  }
  const target = min.map((value, axis) => (value + max[axis]) / 2) as Point3
  const halfWidth = Math.max(Math.abs(min[0] - target[0]), Math.abs(max[0] - target[0])) + 4.5
  const halfHeight = Math.max(Math.abs(min[1] - target[1]), Math.abs(max[1] - target[1])) + 3.6
  const verticalFov = portrait ? 50 : 46
  const verticalTan = Math.tan(verticalFov * Math.PI / 360)
  const horizontalTan = verticalTan * Math.max(aspect, .24)
  const widthDistance = halfWidth / Math.max(horizontalTan * .88, .08)
  const heightDistance = halfHeight / Math.max(verticalTan * .86, .08)
  const nearestZ = max[2]
  const distance = Math.max(portrait ? 34 : 24, widthDistance, heightDistance)

  return {
    position: [target[0], target[1] + (portrait ? 2.4 : 1.8), nearestZ + distance],
    target: [target[0], target[1], target[2] - 4.0],
  }
}
