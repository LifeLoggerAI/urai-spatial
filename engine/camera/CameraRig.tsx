"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { useNavStore } from "../state/navigationState"
import { Vector3 } from "three"
import { useRef } from "react"

export default function CameraRig(){

  const { camera } = useThree()

  const target = useSpatialStore(s=>s.cameraTarget)
  const zoomLevel = useNavStore(s=>s.zoomLevel)

  const pos = useRef(new Vector3())

  const zoomDistances = [
    14,  // life map
    7,   // cluster
    3    // memory
  ]

  useFrame(()=>{

    const dist = zoomDistances[zoomLevel] ?? 14

    if(target){

      pos.current.set(
        target[0],
        target[1],
        target[2] + dist
      )

      camera.position.lerp(pos.current,0.12)

      camera.lookAt(
        target[0],
        target[1],
        target[2]
      )

    } else {

      pos.current.set(0,0,dist)

      camera.position.lerp(pos.current,0.12)

      camera.lookAt(0,0,-5)

    }

  })

  return null
}