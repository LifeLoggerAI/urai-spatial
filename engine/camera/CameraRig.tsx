"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { Vector3 } from "three"
import { useRef } from "react"

const CAMERA_STOP_DISTANCE = 5

export default function CameraRig(){

  const { camera } = useThree()

  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const targetPos = useRef(new Vector3())
  const home = useRef(new Vector3(0,0,6))

  useFrame(()=>{

    if(selectedStar){

      targetPos.current.set(
        selectedStar.position[0],
        selectedStar.position[1],
        selectedStar.position[2] + CAMERA_STOP_DISTANCE
      )

      camera.position.lerp(targetPos.current,0.08)

      camera.lookAt(
        selectedStar.position[0],
        selectedStar.position[1],
        selectedStar.position[2]
      )

    }else{

      camera.position.lerp(home.current,0.06)
      camera.lookAt(0,0,-5)

    }

  })

  return null
}