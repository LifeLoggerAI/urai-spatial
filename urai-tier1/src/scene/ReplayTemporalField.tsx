'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AAA_MOONLIT_PALETTE } from '../spatial/visual/aaaMaterials'

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
  const memoryFieldGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(WAYPOINTS.map((point) => new THREE.Vector3(...point)))
    const positions = new Float32Array(180 * 3)

    for (let index = 0; index < 180; index += 1) {
      const t = index / 179
      const point = curve.getPoint(t)
      const phase = index * 2.399963
      const radius = 0.08 + ((index * 37) % 29) / 70
      positions[index * 3] = point.x + Math.cos(phase) * radius
      positions[index * 3 + 1] = point.y + Math.sin(phase * 1.37) * radius * 0.62
      positions[index * 3 + 2] = point.z + Math.sin(phase) * radius * 0.48
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
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
      <primitive object={new THREE.Line(trailGeometry)} frustumCulled={false}>
        <lineBasicMaterial color={AAA_MOONLIT_PALETTE.paleCyan} transparent opacity={reducedMotion ? 0.13 : 0.24} depthWrite={false} blending={THREE.AdditiveBlending} />
      </primitive>

      <points geometry={memoryFieldGeometry} frustumCulled={false}>
        <pointsMaterial
          color={AAA_MOONLIT_PALETTE.moonSilver}
          size={0.026}
          sizeAttenuation
          transparent
          opacity={reducedMotion ? 0.24 : 0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {WAYPOINTS.map((position, index) => {
        const revealed = index < visibleWaypoints
        const distanceFromProgress = Math.abs(index / Math.max(1, WAYPOINTS.length - 1) - progress)
        const opacity = revealed ? Math.max(0.08, 0.42 - distanceFromProgress * 0.55) : 0.025
        const scale = revealed ? 0.34 + (1 - distanceFromProgress) * 0.14 : 0.18
        return (
          <group key={index} position={position} scale={scale}>
            <mesh>
              <icosahedronGeometry args={[0.42, 2]} />
              <meshBasicMaterial color={index % 2 === 0 ? AAA_MOONLIT_PALETTE.sacredGold : AAA_MOONLIT_PALETTE.paleCyan} transparent opacity={opacity * 0.74} depthWrite={false} blending={THREE.AdditiveBlending} wireframe />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
