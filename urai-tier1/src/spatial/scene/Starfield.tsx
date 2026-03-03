'use client'
import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '../utils/seededRandom'
import { useSceneStore } from '../state/sceneStore'

const STAR_COUNT = 1200
const WORLD_SIZE = 1200

export default function Starfield() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const { selectedStarId } = useSceneStore()
  const random = mulberry32(12345)

  const stars = useMemo(() => {
    return new Array(STAR_COUNT).fill(0).map((_, i) => ({
      id: `star-${i}`,
      position: [
        (random() - 0.5) * WORLD_SIZE,
        (random() - 0.5) * WORLD_SIZE,
        (random() - 0.5) * WORLD_SIZE,
      ] as [number, number, number],
    }))
  }, [])

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    stars.forEach((star, i) => {
      dummy.position.set(...star.position)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [stars])

  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (!mat) return
    const target = selectedStarId ? 0.2 : 0.6
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.05
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, STAR_COUNT]}>
      <sphereGeometry args={[1.2, 12, 12]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.6} />
    </instancedMesh>
  )
}
