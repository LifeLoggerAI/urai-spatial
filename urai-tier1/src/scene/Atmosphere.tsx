'use client'

import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

function FogBand({
  position,
  width,
  height,
  opacity,
  color,
  drift = 0.035,
}: {
  position: [number, number, number]
  width: number
  height: number
  opacity: number
  color: string
  drift?: number
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.x = position[0] + Math.sin(t * drift + position[2]) * 0.42
    ref.current.rotation.z = Math.sin(t * drift * 0.7 + position[0]) * 0.018
  })

  return (
    <mesh ref={ref} position={position} rotation={[-0.04, 0, 0]}>
      <planeGeometry args={[width, height, 1, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function Atmosphere() {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#071023', 0.038)
    return () => {
      scene.fog = null
    }
  }, [scene])

  return (
    <group>
      <FogBand position={[0, -0.28, -9.6]} width={38} height={2.2} opacity={0.075} color="#87b8ff" />
      <FogBand position={[-2.8, -0.02, -13.2]} width={44} height={3.4} opacity={0.052} color="#b69cff" drift={0.024} />
      <FogBand position={[3.2, 0.3, -17.4]} width={52} height={4.8} opacity={0.04} color="#6ee7ff" drift={0.018} />
      <FogBand position={[0, -0.72, -5.6]} width={22} height={1.2} opacity={0.06} color="#ffffff" drift={0.045} />
    </group>
  )
}
