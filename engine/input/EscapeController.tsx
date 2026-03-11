"use client"

import { useEffect } from "react"
import { useSpatialStore } from "../state/spatialStore"

export default function EscapeController(){

  const clearStar = useSpatialStore(s=>s.clearStar)

  useEffect(()=>{

    const handleKey = (e:KeyboardEvent)=>{

      if(e.key === "Escape"){
        clearStar()
      }

    }

    window.addEventListener("keydown", handleKey)

    return ()=>{
      window.removeEventListener("keydown", handleKey)
    }

  },[clearStar])

  return null
}
