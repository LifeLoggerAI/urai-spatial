import { useMemo } from "react"

export function useDeterministicStars(generateStars: (seed: number) => any) {
  return useMemo(() => {
    const SEED = 42
    return generateStars(SEED)
  }, [])
}
