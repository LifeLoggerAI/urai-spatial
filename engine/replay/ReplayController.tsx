"use client"

import { useEffect } from "react"
import { useSpatialStore } from "../state/spatialStore"

export default function ReplayController(){

  const clearSelection = useSpatialStore((s)=>s.clearSelection)

  useEffect(()=>{

    const onKey = (e:KeyboardEvent)=>{
      if(e.key === "Escape"){
        clearSelection()
      }
    }

    window.addEventListener("keydown",onKey)

    return ()=>{
      window.removeEventListener("keydown",onKey)
    }

  },[])

  return null
}
