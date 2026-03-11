"use client"

import { useEffect } from "react"
import { useNavigationState } from "../state/navigationState"
import { useSpatialStore } from "../state/spatialStore"

export default function NavigationController(){

  const setExplore = useNavigationState(s=>s.setExplore)
  const clearStar = useSpatialStore(s=>s.clearStar)

  useEffect(()=>{

    const onKey = (e:KeyboardEvent)=>{

      if(e.key==="Escape"){

        clearStar()
        setExplore()

      }

    }

    window.addEventListener("keydown",onKey)

    return()=>window.removeEventListener("keydown",onKey)

  },[])

  return null

}
