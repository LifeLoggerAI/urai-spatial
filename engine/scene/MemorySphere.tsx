"use client"

import { useSpatialStore } from "../state/spatialStore"
import { useFrame, useLoader } from "@react-three/fiber"
import * as THREE from "three"
import { useRef, useEffect } from "react"

import {
  MEMORY_SPHERE_RADIUS,
  MEMORY_SHELL_RADIUS,
  MEMORY_PULSE_SPEED,
  MEMORY_PULSE_AMPLITUDE
} from "../camera/cameraConfig"

export default function MemorySphere(){

  const selectedStar = useSpatialStore(s => s.selectedStar)

  const innerRef = useRef<THREE.Mesh>(null!)
  const shellRef = useRef<THREE.Mesh>(null!)

  const texture = useLoader(
    THREE.TextureLoader,
    "/memory/sample.jpg"
  )

  useEffect(()=>{
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 16
    texture.needsUpdate = true
  },[texture])

  useFrame(({clock})=>{

    const t = clock.getElapsedTime()

    const pulse =
      1 + Math.sin(t * MEMORY_PULSE_SPEED) * MEMORY_PULSE_AMPLITUDE

    if(innerRef.current){
      innerRef.current.scale.set(pulse,pulse,pulse)
    }

    if(shellRef.current){
      shellRef.current.scale.set(pulse,pulse,pulse)
    }

  })

  if(!selectedStar) return null

  return(

    <group position={selectedStar.position}>

      {/* interior memory world */}
      <mesh
        ref={innerRef}
        scale={[-1,1,1]}
      >
        <sphereGeometry args={[MEMORY_SPHERE_RADIUS,96,96]} />

        <meshBasicMaterial
          map={texture}
          side={THREE.BackSide}
        />
      </mesh>

      {/* outer glass shell */}
      <mesh ref={shellRef}>

        <sphereGeometry args={[MEMORY_SHELL_RADIUS,64,64]} />

        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.08}
          roughness={0}
          transmission={1}
          thickness={0.35}
        />

      </mesh>

    </group>

  )

}