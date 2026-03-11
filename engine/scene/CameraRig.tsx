"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { CAMERA_STOP_DISTANCE, CAMERA_LERP_SPEED } from "./cameraConfig"
import * as THREE from "three"
import { useRef } from "react"

export default function CameraRig(){

  const { camera } = useThree()
  const selectedStar = useSpatialStore((s)=>s.selectedStar)

  const targetRef = useRef(new THREE.Vector3())
  const baseRef = useRef(new THREE.Vector3(0,0,6))

  useFrame(({clock})=>{

    const t = clock.getElapsedTime()

    if(!selectedStar){

      // subtle idle drift when exploring
      const driftX = Math.sin(t * 0.08) * 0.15
      const driftY = Math.cos(t * 0.06) * 0.08

      const target = new THREE.Vector3(
        baseRef.current.x + driftX,
        baseRef.current.y + driftY,
        baseRef.current.z
      )

      camera.position.lerp(target,0.02)
      camera.lookAt(0,0,-5)

      return
    }

    // normal star focus behavior
    targetRef.current.set(
      selectedStar.position[0],
      selectedStar.position[1] + 0.4,
      selectedStar.position[2] + CAMERA_STOP_DISTANCE
    )

    const dist = camera.position.distanceTo(targetRef.current)

    if(dist > 0.01){
      camera.position.lerp(targetRef.current, CAMERA_LERP_SPEED)
    }else{
      camera.position.copy(targetRef.current)
    }

    camera.lookAt(
      selectedStar.position[0],
      selectedStar.position[1],
      selectedStar.position[2]
    )

  })

  return null
}