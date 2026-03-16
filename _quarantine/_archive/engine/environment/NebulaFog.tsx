"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function NebulaFog() {

  const meshRef = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(500, 500),
    []
  )

  useFrame(({ clock }) => {

    if (!meshRef.current) return

    const mesh = meshRef.current

    // billboard toward camera
    mesh.quaternion.copy(camera.quaternion)

    // subtle nebula rotation
    mesh.rotateZ(clock.elapsedTime * 0.01)

  })

  return (

    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, 0, -120]}
      frustumCulled={false}
    >

      <meshBasicMaterial
        color="#24325f"
        transparent
        opacity={0.08}
        depthWrite={false}
        depthTest={false}
      />

    </mesh>

  )

}