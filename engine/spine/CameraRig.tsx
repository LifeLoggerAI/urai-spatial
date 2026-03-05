"use client"

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function CameraRig(){

  const { camera } = useThree()

  const selectedStarId = useSpatialStore(s=>s.selectedStarId)
  const starPositions = useSpatialStore(s=>s.starPositions)

  const target = new THREE.Vector3()

  useFrame(()=>{

    if(selectedStarId===null) return

    const p = starPositions[selectedStarId]
    if(!p) return

    target.copy(p).add(new THREE.Vector3(0,0,6))

    const dist = camera.position.distanceTo(target)

    if(dist > 0.02){
      camera.position.lerp(target,0.07)
    } else {
      camera.position.copy(target)
    }

    camera.lookAt(p)

  })

  return null
}
