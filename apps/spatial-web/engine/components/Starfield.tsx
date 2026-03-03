'use client'

import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { useLifeMapStore } from '../state/useLifeMapStore'

const STAR_COUNT = 800
const RADIUS = 60

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export default function Starfield() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const colorRef = useRef<THREE.InstancedBufferAttribute | null>(null)

  const selectedIndex = useLifeMapStore((s) => s.selectedIndex)

  const stars = useMemo(() => {
    const positions: THREE.Vector3[] = []

    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = seededRandom(i * 12.989) * 2 * Math.PI
      const phi = Math.acos(2 * seededRandom(i * 78.233) - 1)

      positions.push(
        new THREE.Vector3(
          RADIUS * Math.sin(phi) * Math.cos(theta),
          RADIUS * Math.sin(phi) * Math.sin(theta),
          RADIUS * Math.cos(phi)
        )
      )
    }

    return positions
  }, [])

  // Apply instance matrices once
  useEffect(() => {
    if (!meshRef.current) return

    const dummy = new THREE.Object3D()

    stars.forEach((star, i) => {
      dummy.position.copy(star)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  }, [stars])

  // Allocate color buffer once
  useEffect(() => {
    if (!meshRef.current) return

    const colors = new Float32Array(STAR_COUNT * 3)

    for (let i = 0; i < STAR_COUNT; i++) {
      colors.set([0.2, 0.3, 0.6], i * 3)
    }

    const attr = new THREE.InstancedBufferAttribute(colors, 3)
    meshRef.current.instanceColor = attr
    colorRef.current = attr
  }, [])

  // Mutate buffer on selection (no reallocation)
  useEffect(() => {
    if (!colorRef.current) return

    const colors = colorRef.current.array as Float32Array

    for (let i = 0; i < STAR_COUNT; i++) {
      if (i === selectedIndex) {
        colors.set([1, 1, 1], i * 3)
      } else {
        colors.set([0.2, 0.3, 0.6], i * 3)
      }
    }

    colorRef.current.needsUpdate = true
  }, [selectedIndex])

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const index = e.instanceId
    if (index == null) return

    useLifeMapStore.getState().setSelectedIndex(index)
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as any, undefined as any, STAR_COUNT]}
      onClick={handleClick}
      raycast={THREE.InstancedMesh.prototype.raycast}
    >
      <sphereGeometry args={[3, 12, 12]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  )
}