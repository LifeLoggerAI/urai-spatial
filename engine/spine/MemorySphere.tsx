"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function MemorySphere(){

  const meshRef = useRef<THREE.Mesh>(null!)

  const selectedStarId = useSpatialStore(s=>s.selectedStarId)
  const starPositions = useSpatialStore(s=>s.starPositions)

  useFrame((state)=>{

    const mesh = meshRef.current
    if(!mesh) return

    if(selectedStarId === null){
      mesh.visible = false
      return
    }

    const p = starPositions[selectedStarId]
    if(!p) return

    mesh.visible = true

    // move sphere slightly toward camera
    mesh.position.set(p.x, p.y, p.z + 3)

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.08
    mesh.scale.setScalar(pulse)

  })

  return(
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[2.5,32,32]} />
      <meshBasicMaterial color="#66ccff" wireframe />
    </mesh>
  )

}
