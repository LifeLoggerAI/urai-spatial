'use client'

import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'

function seededNoise(index: number) {
  const x = Math.sin(index * 9283.33) * 43758.5453
  return x - Math.floor(x)
}

function tierOpacity(tier: number, base: number, step = 0.045) {
  return Math.min(0.9, base + Math.max(0, tier - 1) * step)
}

function StarField({ count = 1220, radius = 66, skyTier = 3, reducedMotion = false }: { count?: number; radius?: number; skyTier?: number; reducedMotion?: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const theta = seededNoise(i + 1) * Math.PI * 2
      const y = 0.08 + seededNoise(i + 12) * 0.88
      const horizontal = Math.sqrt(Math.max(0, 1 - y * y))
      const twinkle = 0.58 + seededNoise(i + 31) * 0.42
      const depth = radius + seededNoise(i + 77) * 28

      positions[i * 3] = Math.cos(theta) * horizontal * depth
      positions[i * 3 + 1] = y * depth - 8
      positions[i * 3 + 2] = Math.sin(theta) * horizontal * depth - 16

      colors[i * 3] = 0.58 + twinkle * 0.34
      colors[i * 3 + 1] = 0.68 + twinkle * 0.24
      colors[i * 3 + 2] = 0.9 + twinkle * 0.1
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [count, radius])

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = clock.elapsedTime * 0.0028
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.05) * 0.005
    const material = ref.current.material
    if (material instanceof THREE.PointsMaterial) {
      material.opacity = tierOpacity(skyTier, 0.68, 0.04) + Math.sin(clock.elapsedTime * 0.4) * 0.035
    }
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.06} vertexColors transparent opacity={tierOpacity(skyTier, 0.72, 0.035)} depthWrite={false} />
    </points>
  )
}

function ConstellationHints({ skyTier = 3, reducedMotion = false }: { skyTier?: number; reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const paths = useMemo(() => {
    const sets = [
      [[-8, 4.8, -23], [-4.5, 6.1, -25], [-1.2, 5.2, -24], [2.5, 6.6, -26]],
      [[4.8, 3.8, -21], [7.5, 5.4, -24], [10.2, 4.2, -23]],
      [[-10.5, 2.8, -19], [-7.5, 3.5, -20.5], [-5.1, 2.6, -19.5]],
    ] as Array<Array<[number, number, number]>>
    return sets.map((points) => new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p))))
  }, [])

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.x = Math.sin(clock.elapsedTime * 0.07) * 0.14
    group.current.position.y = Math.cos(clock.elapsedTime * 0.05) * 0.08
  })

  return (
    <group ref={group}>
      {paths.map((geometry, index) => (
        <line key={index} geometry={geometry}>
          <lineBasicMaterial color={index === 1 ? '#c4b5fd' : '#8edcff'} transparent opacity={tierOpacity(skyTier, 0.12, 0.035)} />
        </line>
      ))}
    </group>
  )
}

function AuroraVeils({ skyTier = 3, reducedMotion = false }: { skyTier?: number; reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.children.forEach((child, index) => {
      child.position.x = Math.sin(clock.elapsedTime * (0.08 + index * 0.02) + index) * 0.45
      child.rotation.z = Math.sin(clock.elapsedTime * 0.06 + index) * 0.035
    })
  })

  return (
    <group ref={group}>
      <mesh position={[-5.8, 3.2, -24]} rotation={[0.06, 0, -0.16]}>
        <planeGeometry args={[28, 8]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={tierOpacity(skyTier, 0.08, 0.025)} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[5.2, 2.5, -22]} rotation={[0.03, 0, 0.14]}>
        <planeGeometry args={[26, 7]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={tierOpacity(skyTier, 0.07, 0.022)} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.4, -18]} rotation={[0.02, 0, 0]}>
        <planeGeometry args={[34, 5.5]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={tierOpacity(skyTier, 0.045, 0.018)} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function MistBands({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.children.forEach((child, index) => {
      child.position.x = Math.sin(clock.elapsedTime * (0.05 + index * 0.01) + index) * 0.34
    })
  })

  return (
    <group ref={group}>
      <mesh position={[0, -0.18, -12]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[52, 3.8]} />
        <meshBasicMaterial color="#b49cff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.72, -15]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[64, 4.2]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export default function Sky({ skyTier = 3, reducedMotion = false }: { skyTier?: number; reducedMotion?: boolean }) {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color('#020614')
  }, [scene])

  return (
    <group data-testid="urai-sky-world">
      <mesh scale={[-1, 1, 1]} position={[0, -6.5, -8]}>
        <sphereGeometry args={[100, 64, 32]} />
        <meshBasicMaterial color="#020614" side={THREE.BackSide} />
      </mesh>

      <mesh scale={[-1, 1, 1]} position={[0, -10.5, -14]}>
        <sphereGeometry args={[96, 64, 32]} />
        <meshBasicMaterial color="#09204f" side={THREE.BackSide} transparent opacity={0.42} depthWrite={false} />
      </mesh>

      <mesh scale={[-1, 1, 1]} position={[0, -13.5, -18]}>
        <sphereGeometry args={[94, 64, 32]} />
        <meshBasicMaterial color="#162a63" side={THREE.BackSide} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh position={[0, 1.1, -20]} rotation={[0, 0, 0]}>
        <planeGeometry args={[48, 13]} />
        <meshBasicMaterial color="#7f9cff" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <AuroraVeils skyTier={skyTier} reducedMotion={reducedMotion} />
      <MistBands reducedMotion={reducedMotion} />
      <ConstellationHints skyTier={skyTier} reducedMotion={reducedMotion} />
      <StarField skyTier={skyTier} reducedMotion={reducedMotion} />
    </group>
  )
}
