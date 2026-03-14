"use client"

import { useMemo } from "react"
import { useSpatialStore } from "../state/spatialStore"
import { getMemoryForStar } from "./getMemoryForStar"
import type { Memory } from "./memoryTypes"

export default function useSelectedMemory(): Memory | null {

  const star = useSpatialStore(s => s.selectedStar)

  const memory = useMemo(() => {
    if (!star) return null
    return getMemoryForStar(star)
  }, [star?.id])

  return memory
}