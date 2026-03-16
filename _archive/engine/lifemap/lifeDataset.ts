import { lifeDataset } from "./lifeDataset"

export type LifeStar = {
  id: number
  year: number
  position: [number, number, number]
}

const START_YEAR = 1980
const YEARS = 80
const STARS_PER_YEAR = 40

function mulberry32(seed: number) {
  let a = seed
  return () => {
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const lifeDataset: LifeStar[] = (() => {

  const rand = mulberry32(42)

  const stars: LifeStar[] = []
  let id = 0

  for (let year = 0; year < YEARS; year++) {

    const actualYear = START_YEAR + year

    for (let i = 0; i < STARS_PER_YEAR; i++) {

      const radius = Math.pow(rand(), 0.6) * 2.8
      const angle = rand() * Math.PI * 2

      const jitter = 0.25

      const x =
        Math.cos(angle) * radius +
        (rand() - 0.5) * jitter

      const y =
        Math.sin(angle) * radius +
        (rand() - 0.5) * jitter

      const z =
        -year * 2 +
        (rand() - 0.5) * 0.8

      stars.push({
        id: id++,
        year: actualYear,
        position: [x, y, z]
      })

    }

  }

  return stars

})()