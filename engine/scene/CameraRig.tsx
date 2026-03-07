"use client"

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatial } from "@/stores/spatialStore"

export default function CameraRig(){

  const {camera} = useThree()

  const position = useSpatial(s=>s.position)
  const selected = useSpatial(s=>s.selected)

  const target = new THREE.Vector3()

  useFrame(()=>{

    if(selected===null) return

    target.set(
      position[0],
      position[1],
      position[2] + 12
    )

    camera.position.lerp(target,0.045)

    camera.lookAt(
      position[0],
      position[1],
      position[2]
    )

  })

  return null
}
