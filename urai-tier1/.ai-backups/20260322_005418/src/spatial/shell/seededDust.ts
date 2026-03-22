export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededDust(seed = 1, count = 24) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: `dust-${seed}-${i}`,
    x: rand(),
    y: rand(),
    size: 0.25 + rand() * 1.25,
    alpha: 0.14 + rand() * 0.24,
  }));
}
