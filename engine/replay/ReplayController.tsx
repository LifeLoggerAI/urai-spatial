"use client"

import { useEffect } from "react"
import { useSpatialStore } from "../state/spatialStore"

export default function ReplayController(){

  const resetSelection = useSpatialStore(s=>s.resetSelection)

  useEffect(()=>{

    const handleKey = (e:KeyboardEvent)=>{

      if(e.key === "Escape"){

        const { inReplayMode, selectedStarId } = useSpatialStore.getState()

        if(inReplayMode || selectedStarId!==null){
          resetSelection()
        }

      }

    }

    window.addEventListener("keydown",handleKey)

    return()=>{
      window.removeEventListener("keydown",handleKey)
    }

  },[resetSelection])

  return null

}
