let __seed = 1337

export function uraiNow(): number {
  return 1700000000000
}

export function uraiRandom(): number {
  __seed = (__seed * 1664525 + 1013904223) % 4294967296
  return __seed / 4294967296
}

export function uraiId(prefix = "id"): string {
  return prefix + "_" + Math.floor(uraiRandom() * 1e9)
}

export function uraiTime(): number {
  return 0
}
