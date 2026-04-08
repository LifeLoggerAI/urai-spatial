'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshBasicMaterial } from 'three'

type Props = {
  starId?: string
  visible?: boolean
  opacity?: number
  onExit?: () => void
}

export default function ReplayScene({
  starId: _starId,
  visible = true,
  opacity = 1,
  onExit,
}: Props) {
  const rootRef = useRef<Group>(null)
  const farRef = useRef<Mesh>(null)
  const shell1Ref = useRef<Mesh>(null)
  const shell2Ref = useRef<Mesh>(null)
  const shell3Ref = useRef<Mesh>(null)
  const coreGlowRef = useRef<Mesh>(null)
  const coreRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (rootRef.current) {
      rootRef.current.rotation.z = Math.sin(t * 0.10) * 0.012
      rootRef.current.position.y = Math.sin(t * 0.16) * 0.02
    }

    const drift = (base: number, amp: number, speed: number, phase: number) =>
      base * (1 + amp * Math.sin(t * speed + phase))

    if (farRef.current) {
      farRef.current.scale.setScalar(drift(1, 0.020, 0.24, 0.1))
      const m = farRef.current.material as MeshBasicMaterial
      m.opacity = 0.22 * opacity * (0.94 + 0.06 * Math.sin(t * 0.30))
    }

    if (shell1Ref.current) {
      shell1Ref.current.scale.setScalar(drift(1, 0.018, 0.32, 0.7))
      const m = shell1Ref.current.material as MeshBasicMaterial
      m.opacity = 0.34 * opacity * (0.95 + 0.07 * Math.sin(t * 0.36 + 0.4))
    }

    if (shell2Ref.current) {
      shell2Ref.current.scale.setScalar(drift(1, 0.016, 0.44, 1.3))
      const m = shell2Ref.current.material as MeshBasicMaterial
      m.opacity = 0.52 * opacity * (0.95 + 0.08 * Math.sin(t * 0.46 + 1.0))
    }

    if (shell3Ref.current) {
      shell3Ref.current.scale.setScalar(drift(1, 0.014, 0.60, 1.8))
      const m = shell3Ref.current.material as MeshBasicMaterial
      m.opacity = 0.74 * opacity * (0.96 + 0.08 * Math.sin(t * 0.62 + 1.5))
    }

    if (coreGlowRef.current) {
      coreGlowRef.current.scale.setScalar(drift(1, 0.024, 0.82, 0.5))
      const m = coreGlowRef.current.material as MeshBasicMaterial
      m.opacity = 0.40 * opacity * (0.92 + 0.12 * Math.sin(t * 0.88 + 0.8))
    }

    if (coreRef.current) {
      coreRef.current.scale.setScalar(drift(1, 0.020, 1.05, 0.2))
      const m = coreRef.current.material as MeshBasicMaterial
      m.opacity = 0.16 * opacity * (0.90 + 0.14 * Math.sin(t * 1.10 + 1.7))
    }
  })

  if (!visible) return null

  return (
    <group ref={rootRef}>
      <mesh ref={farRef} position={[0, 0, -4.2]}>
        <sphereGeometry args={[3.0, 52, 52]} />
        <meshBasicMaterial color="#040912" transparent opacity={0.22 * opacity} />
      </mesh>

      <mesh ref={shell1Ref} position={[0, 0, -3.1]}>
        <sphereGeometry args={[2.25, 44, 44]} />
        <meshBasicMaterial color="#08111c" transparent opacity={0.34 * opacity} />
      </mesh>

      <mesh ref={shell2Ref} position={[0, 0, -2.2]}>
        <sphereGeometry args={[1.48, 40, 40]} />
        <meshBasicMaterial color="#0c1726" transparent opacity={0.52 * opacity} />
      </mesh>

      <mesh ref={shell3Ref} position={[0, 0, -1.45]}>
        <sphereGeometry args={[0.92, 34, 34]} />
        <meshBasicMaterial color="#132235" transparent opacity={0.74 * opacity} />
      </mesh>

      <mesh ref={coreGlowRef} position={[0, 0, -1.00]}>
        <sphereGeometry args={[0.56, 28, 28]} />
        <meshBasicMaterial color="#dfe9ff" transparent opacity={0.40 * opacity} />
      </mesh>

      <mesh ref={coreRef} position={[0, 0, -0.84]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.16 * opacity} />
      </mesh>

      {onExit ? (
        <group
          onClick={(e) => {
            e.stopPropagation()
            onExit()
          }}
        />
      ) : null}
    </group>
  )
}
