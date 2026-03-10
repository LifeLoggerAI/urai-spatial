"use client"

import { useSpatialStore } from "../store/spatialStore"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"

const SKY_POSITION = new THREE.Vector3(0,0,6)
const LERP = 0.08

export default function SceneController(){

  const { camera } = useThree()

  const star = useSpatialStore(s=>s.selectedStar)
  const mode = useSpatialStore(s=>s.mode)

  useFrame(()=>{

    if(mode === "map"){

      camera.position.lerp(SKY_POSITION,LERP)
      camera.lookAt(0,0,0)
      return

    }

    if(!star || !star.position) return

    const [x,y,z] = star.position

    const target = new THREE.Vector3(x,y,z)
    const desired = new THREE.Vector3(x,y,z + 2.9)

    camera.position.lerp(desired,LERP)
    camera.lookAt(target)

  })

  return null
}
