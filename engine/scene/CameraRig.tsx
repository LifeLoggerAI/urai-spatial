"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"
import { Vector3 } from "three"
import { useRef } from "react"

export default function CameraRig(){

  const { camera } = useThree()

  const target = useSpatialStore((s)=>s.cameraTarget)

  const goal = useRef(new Vector3())
  const home = useRef(new Vector3(0,0,6))

  useFrame(()=>{

    if(target){

      goal.current.set(
        target[0],
        target[1],
        target[2] + 3
      )

      camera.position.lerp(goal.current,0.08)

      if(camera.position.distanceTo(goal.current) < 0.01){
        camera.position.copy(goal.current)
      }

      camera.lookAt(
        target[0],
        target[1],
        target[2]
      )

    } else {

      camera.position.lerp(home.current,0.06)

      if(camera.position.distanceTo(home.current) < 0.01){
        camera.position.copy(home.current)
      }

      camera.lookAt(0,0,-5)

    }

  })

  return null
}