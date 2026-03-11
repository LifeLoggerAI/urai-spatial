"use client"

import { useEffect } from "react"
import { useNavStore } from "../state/navigationState"
import { useSpatialStore } from "../state/spatialStore"

export default function NavigationController(){

  const clearStar = useSpatialStore(s=>s.clearStar)

  useEffect(()=>{

    const wheel = (e:WheelEvent)=>{

      useNavStore.setState((state)=>{

        let next = state.zoomLevel

        if(e.deltaY > 0){
          next = Math.min(2, state.zoomLevel + 1)
        } else {
          next = Math.max(0, state.zoomLevel - 1)
        }

        return { zoomLevel: next }

      })

    }

    const key = (e:KeyboardEvent)=>{
      if(e.key === "Escape"){
        clearStar()
        useNavStore.setState({ zoomLevel: 0 })
      }
    }

    document.addEventListener("wheel", wheel, { passive:false })
    window.addEventListener("keydown", key)

    return ()=>{
      document.removeEventListener("wheel", wheel)
      window.removeEventListener("keydown", key)
    }

  },[])

  return null
}
