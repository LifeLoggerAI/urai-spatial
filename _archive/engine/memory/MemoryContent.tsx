"use client"

import { useRef, useEffect } from "react"
import { useSpatialStore } from "../store/spatialStore"
import { useLoader, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function MemoryContent() {

  const selectedStar = useSpatialStore((s) => s.selectedStar)

  const { camera } = useThree()

  const meshRef = useRef<THREE.Mesh>(null)

  const texture = useLoader(
    THREE.TextureLoader,
    "/memory/sample.jpg"
  )

  useEffect(() => {

    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 16
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true

  }, [texture])

  useFrame(() => {

    const mesh = meshRef.current
    if (!mesh || !selectedStar) return

    mesh.lookAt(camera.position)

  })

  if (!selectedStar) return null

  const [x, y, z] = selectedStar.position

  return (
    <mesh
      ref={meshRef}
      position={[x, y, z + 0.02]}
    >
      <planeGeometry args={[1.2, 1.2]} />

      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />

    </mesh>
  )
}