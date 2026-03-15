'use client'

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

export default function InstancedStars() {
  const starCount = 3000
  const radius = 80
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useRef(new THREE.Object3D())
  const scales = useMemo(() => new Array(starCount).fill(0).map(() => 0.05 + Math.random() * 0.1), [])

  // generate star positions in a full 3D sphere
  const starPositions = useMemo(() => {
    const positions: THREE.Vector3[] = []
    for (let i = 0; i < starCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1)
      const theta = 2 * Math.PI * Math.random()
      const r = radius * Math.cbrt(Math.random()) // volumetric distribution
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

  // initial placement
  useEffect(() => {
    if (!meshRef.current) return
    starPositions.forEach((pos, i) => {
      dummy.current.position.copy(pos)
      dummy.current.scale.setScalar(scales[i])
      dummy.current.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.current.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [starPositions, scales])

  // subtle twinkle animation
  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    starPositions.forEach((pos, i) => {
      dummy.current.position.copy(pos)
      const scaleVariation = scales[i] * (0.8 + 0.2 * Math.sin(time + i))
      dummy.current.scale.setScalar(scaleVariation)
      dummy.current.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.current.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, starCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="white" toneMapped={false} />
      </instancedMesh>

      {/* Post-processing glow + subtle vignette */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.8}
          luminanceSmoothing={0.5}
          height={300}
          intensity={0.2}
          kernelSize={3}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.2} />
      </EffectComposer>
    </>
  )
}
