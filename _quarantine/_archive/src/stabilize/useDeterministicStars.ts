import { useMemo } from "react";

const STAR_SEED = 42;

export function useDeterministicStars<T>(
  generateStars: (seed: number) => T
): T {
  return useMemo(() => generateStars(STAR_SEED), [generateStars]);
}