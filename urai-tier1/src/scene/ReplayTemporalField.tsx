'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AAA_MOONLIT_PALETTE, MistLightMaterial } from '../spatial/visual/aaaMaterials'

export type ReplayTemporalFieldProps = {
  active?: boolean
  reducedMotion?: boolean
  progressMs: number
  durationMs: number
  segmentId?: string
}

const WAYPOINTS: Array<[number, number, number]> = [
  [0, 0.2, -0.8],
  [-1.15, 0.45, -1.9],
  [0.65, 0.72, -3.0],
  [1.45, 0.55, -4.2],
  [0.2, 0.38, -5.4],
]

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export default function ReplayTemporalField({ active = true, reducedMotion = false, progressMs, durationMs, segmentId }: ReplayTemporalFieldProps) {
  const groupRef = useRef<THREE.Group>(null)
  const progress = clamp01(durationMs > 0 ? progressMs / durationMs : 0)
  const trailGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(WAYPOINTS.map((point) => new THREE.Vector3(...point)))
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(96))
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current || !active || reducedMotion) return
    const t = clock.elapsedTime
    groupRef.current.rotation.y = Math.sin(t * 0.09) * 0.035
    groupRef.current.position.z = Math.sin(t * 0.18) * 0.045
  })

  if (!active) return null

  const visibleWaypoints = Math.max(1, Math.ceil(progress * WAYPOINTS.length))

  return (
    <group ref={groupRef} name="urai-replay-temporal-field" data-testid="urai-replay-temporal-field" userData={{ replayProgress: progress, replaySegmentId: segmentId ?? 'unknown' }}>
      <line geometry={trailGeometry} frustumCulled={false}>
        <lineBasicMaterial color={AAA_MOONLIT_PALETTE.paleCyan} transparent opacity={reducedMotion ? 0.16 : 0.34} depthWrite={false} blending={THREE.AdditiveBlending} />
      </line>

      {WAYPOINTS.map((position, index) => {
        const revealed = index < visibleWaypoints
        const distanceFromProgress = Math.abs(index / Math.max(1, WAYPOINTS.length - 1) - progress)
        const opacity = revealed ? Math.max(0.08, 0.42 - distanceFromProgress * 0.55) : 0.025
        const scale = revealed ? 0.34 + (1 - distanceFromProgress) * 0.14 : 0.18
        return (
          <group key={index} position={position} scale={scale}>
            <mesh>
              <sphereGeometry args={[1, 32, 16]} />
              <meshBasicMaterial color={index % 2 === 0 ? AAA_MOONLIT_PALETTE.sacredGold : AAA_MOONLIT_PALETTE.paleCyan} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.18, 0.015, 8, 96]} />
              <meshBasicMaterial color={AAA_MOONLIT_PALETTE.moonSilver} transparent opacity={opacity * 0.72} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        )
      })}

      <mesh position={[0, 0.26, -3.25]} rotation={[-0.08, 0, 0]}>
        <planeGeometry args={[7.8, 2.8]} />
        <MistLightMaterial color={AAA_MOONLIT_PALETTE.sacredGold} opacity={reducedMotion ? 0.025 : 0.055} />
      </mesh>
    </group>
  )
}
