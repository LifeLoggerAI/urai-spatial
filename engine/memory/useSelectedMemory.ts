"use client"

import { useMemo } from "react"
import { useSpatialStore } from "../state/spatialStore"
import { getMemoryForStar } from "./getMemoryForStar"

export default function useSelectedMemory(){

  const star = useSpatialStore(s=>s.selectedStar)

  const memory = useMemo(()=>{

    return getMemoryForStar(star)

  },[star])

  return memory

}
