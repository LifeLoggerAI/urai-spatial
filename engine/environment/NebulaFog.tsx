"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function NebulaFog() {

  const ref = useRef<THREE.Mesh>(null!)

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(500, 500),
    []
  )

  useFrame(({ clock, camera }) => {

    if (!ref.current) return

    ref.current.rotation.z = clock.elapsedTime * 0.01

    // keep the fog facing the camera
    ref.current.lookAt(camera.position)

  })

  return (

    <mesh
      ref={ref}
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