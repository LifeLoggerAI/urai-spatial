"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import * as THREE from "three"
import { useRef } from "react"

import {
  CAMERA_HOME,
  CAMERA_STOP_DISTANCE,
  CAMERA_LERP_SPEED
} from "./cameraConfig"

export default function CameraRig(){

  const { camera } = useThree()
  const selectedStar = useSpatialStore(s => s.selectedStar)

  const home = useRef(new THREE.Vector3(...CAMERA_HOME))
  const targetPos = useRef(new THREE.Vector3())
  const starVec = useRef(new THREE.Vector3())

  useFrame(()=>{

    if(!selectedStar){

      camera.position.lerp(home.current,0.05)
      camera.lookAt(0,0,-5)
      return
    }

    starVec.current.set(
      selectedStar.position[0],
      selectedStar.position[1],
      selectedStar.position[2]
    )

    targetPos.current.set(
      starVec.current.x,
      starVec.current.y,
      starVec.current.z + CAMERA_STOP_DISTANCE
    )

    camera.position.lerp(targetPos.current, CAMERA_LERP_SPEED)
    camera.lookAt(starVec.current)

  })

  return null
}