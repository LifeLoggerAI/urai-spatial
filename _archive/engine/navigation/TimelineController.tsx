"use client"

import { useEffect } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

const SCROLL_SPEED = 0.12
const MIN_Z = -220
const MAX_Z = 60

const temp = new THREE.Vector3()

export default function TimelineController() {

  useEffect(() => {

    const handleWheel = (e: WheelEvent) => {

      e.preventDefault()

      const state = useSpatialStore.getState()

      if (state.interactionLock) return

      const current =
        state.cameraTarget instanceof THREE.Vector3
          ? state.cameraTarget
          : temp.set(0, 0, 6)

      const nextZ = THREE.MathUtils.clamp(
        current.z + e.deltaY * SCROLL_SPEED,
        MIN_Z,
        MAX_Z
      )

      temp.set(current.x, current.y, nextZ)

      useSpatialStore.setState({
        cameraTarget: temp.clone()
      })

    }

    window.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      window.removeEventListener("wheel", handleWheel)
    }

  }, [])

  return null

}