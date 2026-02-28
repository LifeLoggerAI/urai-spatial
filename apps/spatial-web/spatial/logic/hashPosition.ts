
/**
 * A simple string hashing function to generate a pseudo-random float.
 * This is NOT a cryptographic hash. It's for deterministic positioning.
 * @param str The string to hash.
 * @param seed A seed to vary the hash.
 * @returns A float between 0 and 1.
 */
export function hashStringToFloat(str: string, seed = 0): number {
  let hash = seed;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Convert hash to a float between 0 and 1
  const thirtyTwoBitMax = 0xFFFFFFFF;
  return (hash & 0x7FFFFFFF) / thirtyTwoBitMax;
}

/**
 * Generates a deterministic 3D position from a string ID inside a sphere.
 * @param id The unique string identifier.
 * @param spread The radius of the sphere.
 * @returns A tuple representing [x, y, z] coordinates.
 */
export function getDeterministicPosition(id: string, spread: number): [number, number, number] {
  const u = hashStringToFloat(id, 1); // 0 to 1
  const v = hashStringToFloat(id, 2); // 0 to 1

  const theta = u * 2 * Math.PI;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(hashStringToFloat(id, 3)) * spread;

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  return [x, y, z];
}
