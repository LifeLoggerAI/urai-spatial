'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, MeshBasicMaterial, Mesh } from 'three'

type Props = {
  starId?: string
  position?: [number, number, number]
  visible?: boolean
  opacity?: number
  onEnterReplay?: () => void
}

export default function FocusSubject({
  starId: _starId,
  position = [0, 0, 0],
  visible = true,
  opacity = 1,
  onEnterReplay,
}: Props) {
  const rootRef = useRef<Group>(null)
  const auraOuterRef = useRef<Mesh>(null)
  const auraMidRef = useRef<Mesh>(null)
  const coreRef = useRef<Mesh>(null)
  const innerRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pulseA = 1 + Math.sin(t * 0.95) * 0.012
    const pulseB = 1 + Math.sin(t * 1.25 + 0.8) * 0.018
    const pulseC = 1 + Math.sin(t * 1.6 + 1.7) * 0.010

    if (rootRef.current) {
      rootRef.current.rotation.z = Math.sin(t * 0.18) * 0.015
    }

    if (auraOuterRef.current) {
      auraOuterRef.current.scale.setScalar(pulseA)
      const m = auraOuterRef.current.material as MeshBasicMaterial
      m.opacity = 0.045 * opacity * (0.92 + 0.08 * Math.sin(t * 0.7 + 0.4))
    }

    if (auraMidRef.current) {
      auraMidRef.current.scale.setScalar(pulseB)
      const m = auraMidRef.current.material as MeshBasicMaterial
      m.opacity = 0.10 * opacity * (0.94 + 0.10 * Math.sin(t * 1.05 + 1.2))
    }

    if (coreRef.current) {
      coreRef.current.scale.setScalar(pulseC)
      const m = coreRef.current.material as MeshBasicMaterial
      m.opacity = opacity * (0.985 + 0.015 * Math.sin(t * 1.4))
    }

    if (innerRef.current) {
      innerRef.current.scale.setScalar(1 + Math.sin(t * 1.8 + 0.5) * 0.022)
      const m = innerRef.current.material as MeshBasicMaterial
      m.opacity = 0.14 * opacity * (0.92 + 0.12 * Math.sin(t * 1.7 + 2.1))
    }
  })

  if (!visible) return null

  return (
    <group ref={rootRef} position={position}>
      <mesh ref={auraOuterRef}>
        <sphereGeometry args={[1.08, 36, 36]} />
        <meshBasicMaterial color="#8fb7ff" transparent opacity={0.045 * opacity} />
      </mesh>

      <mesh ref={auraMidRef}>
        <sphereGeometry args={[0.82, 36, 36]} />
        <meshBasicMaterial color="#cfe0ff" transparent opacity={0.10 * opacity} />
      </mesh>

      <mesh
        ref={coreRef}
        onClick={(e) => {
          e.stopPropagation()
          onEnterReplay?.()
        }}
      >
        <sphereGeometry args={[0.60, 36, 36]} />
        <meshBasicMaterial color="#f7f9ff" transparent opacity={opacity} />
      </mesh>

      <mesh ref={innerRef}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.14 * opacity} />
      </mesh>
    </group>
  )
}
