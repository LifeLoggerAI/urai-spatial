"use client"

import { useEffect } from "react"
import { useSpatialStore } from "../state/spatialStore"

export default function TimelineController(){

  useEffect(()=>{

    const handleWheel = (e:WheelEvent)=>{

      const delta = e.deltaY * 0.02

      const state = useSpatialStore.getState()

      const current = state.cameraTarget || [0,0,6]

      const next:[number,number,number] = [
        current[0],
        current[1],
        current[2] + delta
      ]

      useSpatialStore.setState({
        cameraTarget: next
      })

    }

    window.addEventListener("wheel",handleWheel)

    return ()=>window.removeEventListener("wheel",handleWheel)

  },[])

  return null

}
