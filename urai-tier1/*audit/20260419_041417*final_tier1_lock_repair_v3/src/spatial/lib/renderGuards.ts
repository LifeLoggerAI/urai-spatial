export type FiniteVec3 = [number, number, number];

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function magnitude3(v: readonly [number, number, number]): number {
  const [x, y, z] = v;
  return Math.sqrt(x * x + y * y + z * z);
}

export function sanitizeVec3(value: unknown): FiniteVec3 | null {
  if (
    Array.isArray(value) &&
    value.length >= 3 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    isFiniteNumber(value[2])
  ) {
    const out: FiniteVec3 = [value[0], value[1], value[2]];
    if (magnitude3(out) > 0.001) return out;
  }
  return null;
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function celestialToVec3(
  raLike: unknown,
  decLike: unknown,
  distLike: unknown,
  radiusFloor = 18
): FiniteVec3 | null {
  if (!isFiniteNumber(raLike) || !isFiniteNumber(decLike)) return null;

  const raHours = raLike;
  const decDeg = decLike;
  const distRaw = isFiniteNumber(distLike) ? Math.abs(distLike) : radiusFloor;

  const ra = degToRad(raHours * 15);
  const dec = degToRad(decDeg);
  const radius = Math.max(distRaw, radiusFloor);

  const x = radius * Math.cos(dec) * Math.cos(ra);
  const y = radius * Math.sin(dec);
  const z = radius * Math.cos(dec) * Math.sin(ra);

  if (![x, y, z].every(Number.isFinite)) return null;

  const out: FiniteVec3 = [x, y, z];
  if (magnitude3(out) <= 0.001) return null;

  return out;
}

export function getStarVec3(star: any): FiniteVec3 | null {
  if (!star || typeof star !== "object") return null;

  const fromPosition = sanitizeVec3(star.position);
  if (fromPosition) return fromPosition;

  if (isFiniteNumber(star.x) && isFiniteNumber(star.y) && isFiniteNumber(star.z)) {
    const xyz = sanitizeVec3([star.x, star.y, star.z]);
    if (xyz) return xyz;
  }

  const fromCelestial = celestialToVec3(star.ra, star.dec, star.dist);
  if (fromCelestial) return fromCelestial;

  return null;
}

export function starLooksFinite(star: any): boolean {
  return getStarVec3(star) !== null;
}

export function sanitizeStars<T>(input: T[] | null | undefined): T[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item) => starLooksFinite(item as any));
}

export function withResolvedStarPosition<T extends Record<string, any>>(star: T): (T & { position: FiniteVec3 }) | null {
  const position = getStarVec3(star);
  if (!position) return null;
  return { ...star, position };
}

export function resolveRenderableStars<T extends Record<string, any>>(input: T[] | null | undefined): Array<T & { position: FiniteVec3 }> {
  if (!Array.isArray(input)) return [];
  const out: Array<T & { position: FiniteVec3 }> = [];
  for (const star of input) {
    const resolved = withResolvedStarPosition(star);
    if (resolved) out.push(resolved);
  }
  return out;
}
