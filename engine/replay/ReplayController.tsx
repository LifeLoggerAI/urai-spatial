"use client"

import { useEffect } from "react"
import { useSpatialStore } from "../state/spatialStore"

export default function ReplayController(){

  const mode = useSpatialStore(s=>s.mode)
  const exitReplay = useSpatialStore(s=>s.exitReplay)

  useEffect(()=>{

    const onKey = (e:KeyboardEvent)=>{

      if(e.key === "Escape"){

        if(mode === "replay"){
          exitReplay()
        }

      }

    }

    window.addEventListener("keydown", onKey)

    return ()=>{
      window.removeEventListener("keydown", onKey)
    }

  },[mode, exitReplay])

  return null
}