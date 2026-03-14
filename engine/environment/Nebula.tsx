"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function Nebula() {

  const meshRef = useRef<THREE.Mesh>(null!)

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1),
    []
  )

  const texture = useMemo(() => {

    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512

    const context = canvas.getContext("2d")!

    const gradient = context.createRadialGradient(
      256, 256, 0,
      256, 256, 256
    )

    gradient.addColorStop(0, "rgba(255,255,255,0.2)")
    gradient.addColorStop(1, "rgba(0,0,0,0)")

    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 512)

    const tex = new THREE.CanvasTexture(canvas)

    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping

    return tex

  }, [])

  useFrame(({ clock, camera }) => {

    if (!meshRef.current) return

    meshRef.current.rotation.y = clock.getElapsedTime() * 0.02

    // billboard effect so the nebula always faces camera
    meshRef.current.lookAt(camera.position)

  })

  return (

    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, 0, -100]}
      scale={[200, 200, 200]}
      frustumCulled={false}
    >

      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
      />

    </mesh>

  )

}