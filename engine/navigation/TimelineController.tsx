"use client"

import { useEffect } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

const SCROLL_SPEED = 0.12
const MIN_Z = -220
const MAX_Z = 60

export default function TimelineController(){

  useEffect(()=>{

    const handleWheel = (e:WheelEvent)=>{

      e.preventDefault()

      const state = useSpatialStore.getState()

      if(state.interactionLock) return

      const current =
        state.cameraTarget instanceof THREE.Vector3
          ? state.cameraTarget.clone()
          : new THREE.Vector3(0,0,6)

      const delta = e.deltaY * SCROLL_SPEED

      const nextZ = THREE.MathUtils.clamp(
        current.z + delta,
        MIN_Z,
        MAX_Z
      )

      const next = new THREE.Vector3(
        current.x,
        current.y,
        nextZ
      )

      useSpatialStore.setState({
        cameraTarget: next
      })
    }

    window.addEventListener("wheel", handleWheel, { passive:false })

    return ()=>{
      window.removeEventListener("wheel", handleWheel)
    }

  },[])

  return null
}