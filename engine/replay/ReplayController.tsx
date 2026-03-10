"use client"

import { useEffect } from "react"
import { useSpatialStore } from "../state/spatialStore"

export default function ReplayController(){

  const exitReplay = useSpatialStore(s=>s.exitReplay)

  useEffect(()=>{

    const onKey = (e:KeyboardEvent)=>{
      if(e.key === "Escape"){
        exitReplay()
      }
    }

    window.addEventListener("keydown", onKey)

    return ()=>{
      window.removeEventListener("keydown", onKey)
    }

  },[exitReplay])

  return null
}