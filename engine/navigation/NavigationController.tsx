"use client"

import { useEffect, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { memoryDataset } from "../memory/memoryDataset"

const CAMERA_GLIDE_SPEED = 0.06
const TARGET_THRESHOLD = 0.12

export default function NavigationController(){

  const { camera } = useThree()

  const {
    selectedStarId,
    interactionLock,
    setInteractionLock,
    setCameraTarget,
    cameraTarget
  } = useSpatialStore()

  const targetRef = useRef<THREE.Vector3 | null>(null)

  useEffect(()=>{

    if(selectedStarId !== null){

      const star = memoryDataset.find(m => m.id === selectedStarId)

      if(star){
        const target = new THREE.Vector3(...star.position)
        targetRef.current = target
        setCameraTarget(target)
        setInteractionLock(true)
      }

    } else {

      const home = new THREE.Vector3(0,0,50)
      targetRef.current = home
      setCameraTarget(home)
      setInteractionLock(true)

    }

  },[selectedStarId,setCameraTarget,setInteractionLock])

  useFrame(()=>{

    if(!targetRef.current) return

    const target = targetRef.current

    const dist = camera.position.distanceTo(target)

    if(dist > TARGET_THRESHOLD){

      camera.position.lerp(target, CAMERA_GLIDE_SPEED)
      camera.lookAt(target)

    } else {

      if(interactionLock){
        setInteractionLock(false)
      }

    }

  })

  return null
}