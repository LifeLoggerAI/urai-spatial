'use client'

import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'

function seededNoise(index: number) {
  const x = Math.sin(index * 9283.33) * 43758.5453
  return x - Math.floor(x)
}

function StarField({ count = 760, radius = 58 }: { count?: number; radius?: number }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const theta = seededNoise(i + 1) * Math.PI * 2
      const y = 0.14 + seededNoise(i + 12) * 0.78
      const horizontal = Math.sqrt(Math.max(0, 1 - y * y))
      const twinkle = 0.62 + seededNoise(i + 31) * 0.38

      positions[i * 3] = Math.cos(theta) * horizontal * radius
      positions[i * 3 + 1] = y * radius - 7
      positions[i * 3 + 2] = Math.sin(theta) * horizontal * radius - 12

      colors[i * 3] = 0.62 + twinkle * 0.32
      colors[i * 3 + 1] = 0.7 + twinkle * 0.22
      colors[i * 3 + 2] = 1
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [count, radius])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.0025
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.05) * 0.004
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.86} depthWrite={false} />
    </points>
  )
}

export default function Sky() {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color('#020614')
  }, [scene])

  return (
    <group>
      <mesh scale={[-1, 1, 1]} position={[0, -6.5, -8]}>
        <sphereGeometry args={[96, 64, 32]} />
        <meshBasicMaterial color="#020614" side={THREE.BackSide} />
      </mesh>

      <mesh scale={[-1, 1, 1]} position={[0, -10.5, -14]}>
        <sphereGeometry args={[92, 64, 32]} />
        <meshBasicMaterial color="#09204f" side={THREE.BackSide} transparent opacity={0.38} depthWrite={false} />
      </mesh>

      <mesh position={[0, 1.1, -18]} rotation={[0, 0, 0]}>
        <planeGeometry args={[42, 12]} />
        <meshBasicMaterial color="#7f9cff" transparent opacity={0.13} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh position={[0, -0.42, -12]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[44, 3.6]} />
        <meshBasicMaterial color="#b49cff" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <StarField />
    </group>
  )
}
