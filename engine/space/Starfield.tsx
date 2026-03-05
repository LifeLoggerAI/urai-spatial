"use client"

import { useRef, useEffect } from "react"
import { InstancedMesh } from "three"
import * as THREE from "three"

const COUNT = 120

export default function Starfield() {
  const meshRef = useRef<InstancedMesh>(null!)
  const dummy = new THREE.Object3D()

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const radius = 40

    for (let i = 0; i < COUNT; i++) {

      const theta = (i / COUNT) * Math.PI * 2
      const phi = (i * 1.618) % Math.PI

      const x = radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(phi)

      dummy.position.set(x, y, z)

      const scale = 0.03 + (i % 5) * 0.005
      dummy.scale.setScalar(scale)

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="white" />
    </instancedMesh>
  )
}