"use client"

import { useFrame,useThree } from "@react-three/fiber"
import { useSpatialStore } from "../store/spatialStore"
import * as THREE from "three"

export default function CameraRig(){

  const { camera } = useThree()

  const star = useSpatialStore(s=>s.selectedStar)

  useFrame(()=>{

    if(!star) return

    const stop = star.clone().add(new THREE.Vector3(0,0,3))

    camera.position.lerp(stop,0.08)

    camera.lookAt(star)

  })

  return null
}
