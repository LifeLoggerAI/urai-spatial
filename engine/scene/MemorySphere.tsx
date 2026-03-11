"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { STAR_DATA } from "../data/starData"

const loader = new THREE.TextureLoader()

export default function MemorySphere(){

  const mesh = useRef<THREE.Mesh>(null)

  const selectedStarId = useSpatialStore(s => s.selectedStarId)
  const setSelectedStarId = useSpatialStore(s => s.setSelectedStarId)

  const star = useMemo(()=>{
    if(!selectedStarId) return null
    return STAR_DATA.find(s => s.id === selectedStarId) || null
  },[selectedStarId])

  const texture = useMemo(()=>{
    if(!star) return null
    return loader.load(star.image)
  },[star])

  useFrame((state)=>{
    if(!mesh.current) return
    const t = state.clock.getElapsedTime()
    const pulse = 1 + Math.sin(t * 1.2) * 0.02
    mesh.current.scale.set(pulse, pulse, pulse)
  })

  useEffect(()=>{
    const esc = (e:KeyboardEvent)=>{
      if(e.key === "Escape"){
        setSelectedStarId(null)
      }
    }
    window.addEventListener("keydown",esc)
    return ()=>window.removeEventListener("keydown",esc)
  },[setSelectedStarId])

  if(!star || !texture) return null

  return (
    <group position={star.position}>

      {/* main memory sphere */}

      <mesh ref={mesh}>
        <sphereGeometry args={[1.3, 64, 64]} />

        <meshStandardMaterial
          map={texture}
          side={THREE.BackSide}
          emissive="#ffffff"
          emissiveIntensity={0.15}
          roughness={0.4}
          metalness={0}
          transparent
          opacity={1}
        />
      </mesh>

      {/* outer glow */}

      <mesh>
        <sphereGeometry args={[1.45, 64, 64]} />

        <meshBasicMaterial
          color="#ffcc88"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

    </group>
  )
}