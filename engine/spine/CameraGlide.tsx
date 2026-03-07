"use client"

import { useThree,useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../../stores/useSpatialStore"
import { useRef } from "react"
import * as THREE from "three"

const OFFSET=26
const SPEED=0.07
const SNAP=0.05

export default function CameraGlide(){

  const {camera}=useThree()
  const target=useSpatialStore(s=>s.selected)
  const setArrived=useSpatialStore(s=>s.setArrived)

  const goal=useRef(new THREE.Vector3())
  const started=useRef(false)
  const done=useRef(false)

  if(target && !started.current){
    goal.current.set(target[0],target[1],target[2]+OFFSET)
    started.current=true
  }

  useFrame(()=>{
    if(!started.current||done.current) return

    camera.position.lerp(goal.current,SPEED)

    if(camera.position.distanceTo(goal.current)<SNAP){
      camera.position.copy(goal.current)
      done.current=true
      setArrived(true)
    }

    camera.lookAt(
      goal.current.x,
      goal.current.y,
      goal.current.z-OFFSET
    )
  })

  return null
}
