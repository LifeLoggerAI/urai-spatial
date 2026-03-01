'use client'

import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Starfield() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const stars = useMemo(() => {
    const starCount = 2000
    const positions = []
    for (let i = 0; i < starCount; i++) {
      const r = 400
      const theta = Math.random() * 2 * Math.PI
      const phi = Math.acos(2 * Math.random() - 1)
      positions.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        )
      )
    }
    return positions
  }, [])

  useEffect(() => {
    const dummy = new THREE.Object3D()
    stars.forEach((star, i) => {
      dummy.position.copy(star)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [stars])

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.01
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, stars.length]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial color="#88aaff" transparent opacity={0.6} depthWrite={false} />
    </instancedMesh>
  )
}
