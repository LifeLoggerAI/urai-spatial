"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { useNavStore } from "../state/navigationState"
import { Vector3 } from "three"
import { useRef, useEffect } from "react"

export default function CameraRig(){

  const { camera, gl } = useThree()

  const target = useSpatialStore(s => s.cameraTarget)
  const zoomLevel = useNavStore(s => s.zoomLevel)

  const pos = useRef(new Vector3())

  const zoomDistances = [5, 3, 1.8]

  useEffect(() => {

    const wheel = (e: WheelEvent) => {

      e.preventDefault()

      useNavStore.setState((state) => {

        let next = state.zoomLevel

        if (e.deltaY > 0) next = Math.min(2, next + 1)
        else next = Math.max(0, next - 1)

        return { zoomLevel: next }

      })

    }

    const canvas = gl.domElement
    canvas.addEventListener("wheel", wheel, { passive:false })

    return () => {
      canvas.removeEventListener("wheel", wheel)
    }

  }, [gl])

  useFrame(() => {

    const dist = zoomDistances[Math.max(0, Math.min(2, zoomLevel))]

    if (target) {

      pos.current.set(
        target[0],
        target[1],
        target[2] + dist
      )

      camera.position.lerp(pos.current, 0.12)
      camera.lookAt(target[0], target[1], target[2])

    } else {

      pos.current.set(0,0,dist)
      camera.position.lerp(pos.current,0.08)
      camera.lookAt(0,0,-5)

    }

  })

  return null
}
