"use client"

import { useRef, useEffect } from "react"
import { InstancedMesh } from "three"
import * as THREE from "three"

const COUNT = 24

export default function Starfield() {
  const meshRef = useRef<InstancedMesh>(null!)
  const dummy = new THREE.Object3D()

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    for (let i = 0; i < COUNT; i++) {

      const x = (Math.random() - 0.5) * 40
      const y = (Math.random() - 0.5) * 20
      const z = (Math.random() - 0.5) * 20

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(0.25)
      dummy.updateMatrix()

      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="white" />
    </instancedMesh>
  )
}
