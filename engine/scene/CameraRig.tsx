"use client"

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatial } from "@/stores/spatialStore"

export default function CameraRig(){

  const {camera} = useThree()

  const position = useSpatial(s=>s.position)
  const selected = useSpatial(s=>s.selected)
  const setArrived = useSpatial(s=>s.setArrived)

  const target = new THREE.Vector3()

  useFrame(()=>{

    if(selected===null) return

    target.set(position[0],position[1],position[2]+12)

    camera.position.lerp(target,0.05)

    const d = camera.position.distanceTo(target)

    if(d < 0.15){
      camera.position.copy(target)
      setArrived(true)
    }

    camera.lookAt(position[0],position[1],position[2])

  })

  return null
}
