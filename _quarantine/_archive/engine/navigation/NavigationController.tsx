"use client"

import { useEffect, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

const CAMERA_GLIDE_SPEED = 0.06
const TARGET_THRESHOLD = 0.12

export default function NavigationController(){

  const { camera } = useThree()

  const {
    selectedStarPosition,
    interactionLock,
    setInteractionLock,
    setCameraTarget
  } = useSpatialStore()

  const targetRef = useRef<THREE.Vector3 | null>(null)
  const finishedRef = useRef(false)

  useEffect(()=>{

    finishedRef.current = false

    if(selectedStarPosition){

      const target = new THREE.Vector3(
        selectedStarPosition.x,
        selectedStarPosition.y,
        selectedStarPosition.z
      )

      targetRef.current = target
      setCameraTarget(target)
      setInteractionLock(true)

    } else {

      const home = new THREE.Vector3(0,0,50)

      targetRef.current = home
      setCameraTarget(home)
      setInteractionLock(true)

    }

  },[selectedStarPosition,setCameraTarget,setInteractionLock])

  useFrame(()=>{

    if(!targetRef.current) return

    const target = targetRef.current

    const dist = camera.position.distanceTo(target)

    if(dist > TARGET_THRESHOLD){

      camera.position.lerp(target, CAMERA_GLIDE_SPEED)

      camera.lookAt(
        target.x,
        target.y,
        target.z
      )

    } else if(!finishedRef.current){

      finishedRef.current = true

      camera.position.copy(target)

      if(interactionLock){
        setInteractionLock(false)
      }

    }

  })

  return null
}