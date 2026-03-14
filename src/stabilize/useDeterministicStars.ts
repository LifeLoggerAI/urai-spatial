import { useMemo } from "react";

export function useDeterministicStars<T>(generateStars: (seed: number) => T): T {
  return useMemo(() => {
    const SEED = 42;
    return generateStars(SEED);
  }, [generateStars]);
}