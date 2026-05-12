'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AAA_MOONLIT_PALETTE, MistLightMaterial, SacredGlassMaterial } from '../spatial/visual/aaaMaterials'

export default function FocusChamber({ reducedMotion = false, active = true }: { reducedMotion?: boolean; active?: boolean }) {
  const ringRef = useRef<THREE.Group>(null)
  const veilRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!active || reducedMotion) return
    const t = clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.rotation.y = Math.sin(t * 0.16) * 0.045
      ringRef.current.rotation.z = t * 0.018
    }
    if (veilRef.current) {
      veilRef.current.position.y = 0.25 + Math.sin(t * 0.32) * 0.035
    }
  })

  if (!active) return null

  return (
    <group name="urai-focus-chamber" data-testid="urai-focus-chamber" position={[0, 0.02, -1.2]}>
      <mesh ref={veilRef} position={[0, 0.25, -0.02]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[2.85, 64, 24, 0, Math.PI * 2, 0.22, Math.PI * 0.62]} />
        <SacredGlassMaterial color={AAA_MOONLIT_PALETTE.paleCyan} opacity={0.035} emissiveIntensity={0.12} />
      </mesh>

      <group ref={ringRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.43, 0]}>
          <torusGeometry args={[1.64, 0.008, 8, 192]} />
          <meshBasicMaterial color={AAA_MOONLIT_PALETTE.sacredGold} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <torusGeometry args={[2.16, 0.006, 8, 192]} />
          <meshBasicMaterial color={AAA_MOONLIT_PALETTE.paleCyan} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[Math.PI / 2.8, 0, 0]} position={[0, 0.35, 0]}>
          <torusGeometry args={[1.1, 0.005, 8, 160]} />
          <meshBasicMaterial color={AAA_MOONLIT_PALETTE.moonSilver} transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      <mesh position={[0, 0.2, -0.02]} rotation={[0.22, 0, 0]}>
        <planeGeometry args={[4.8, 3.2]} />
        <MistLightMaterial color={AAA_MOONLIT_PALETTE.mistBlue} opacity={0.045} />
      </mesh>
      <pointLight position={[0, 1.1, 0.3]} color={AAA_MOONLIT_PALETTE.paleCyan} intensity={0.85} distance={4.5} />
      <pointLight position={[0.85, 0.2, -0.6]} color={AAA_MOONLIT_PALETTE.sacredGold} intensity={0.38} distance={3.4} />
    </group>
  )
}
