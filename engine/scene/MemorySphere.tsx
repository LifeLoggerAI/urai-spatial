"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function MemorySphere(){

  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const mesh = useRef<THREE.Mesh>(null)

  useFrame((state)=>{

    if(!mesh.current) return

    const t = state.clock.getElapsedTime()

    const pulse = 1 + Math.sin(t*1.2)*0.02

    mesh.current.scale.set(pulse,pulse,pulse)

  })

  if(!selectedStar) return null

  const texture = new THREE.TextureLoader().load("/memory/sample.jpg")

  return(

    <group position={selectedStar.position}>

      {/* main sphere */}

      <mesh ref={mesh}>

        <sphereGeometry args={[1.3,64,64]} />

        <meshStandardMaterial
          map={texture}
          emissive="#ffb347"
          emissiveIntensity={0.05}
          roughness={0.35}
          metalness={0.05}
          transparent
          opacity={0.95}
        />

      </mesh>

      {/* outer glow */}

      <mesh>

        <sphereGeometry args={[1.42,64,64]} />

        <meshBasicMaterial
          color="#ffcc88"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          depthWrite={false}
        />

      </mesh>

    </group>

  )

}