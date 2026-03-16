"use client"

import { useMemo, useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

interface Props {
  position?: [number, number, number]
  texture?: THREE.Texture
}

export default function MemoryImage({ position, texture }: Props) {

  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const pos = useMemo(() => {
    if (!position) return null
    return new THREE.Vector3(
      position[0],
      position[1],
      position[2] - 0.05
    )
  }, [position])

  useEffect(() => {
    if (!texture) return
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 16
    texture.needsUpdate = true
  }, [texture])

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.lookAt(camera.position)
  })

  if (!pos) return null

  return (

    <mesh
      ref={meshRef}
      position={pos}
      renderOrder={10}
    >

      <planeGeometry args={[1.8, 1.8]} />

      <meshBasicMaterial
        color={texture ? "white" : "#eeeeee"}
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />

    </mesh>

  )

}