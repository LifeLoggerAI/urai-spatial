import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

type FocusSubjectProps = {
  visible: boolean
  opacity?: number
  starId?: string
  position?: [number, number, number]
  onEnterReplay?: () => void
  interactive?: boolean
}

export default function FocusSubject({
  visible,
  opacity = 1,
  starId: _starId,
  position = [0, 0, 0],
  onEnterReplay,
  interactive = false,
}: FocusSubjectProps) {
  const groupRef = useRef<THREE.Group>(null)

  const basePosition = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position]
  )

  useFrame((state) => {
    if (!groupRef.current) return

    const t = state.clock.elapsedTime
    groupRef.current.position.set(
      basePosition.x + 0.18 + Math.sin(t * 0.15) * 0.10,
      basePosition.y - 0.08 + Math.cos(t * 0.12) * 0.06,
      basePosition.z
    )
  })

  if (!visible) return null

  return (
    <group
      ref={groupRef}
      onClick={interactive ? () => onEnterReplay?.() : undefined}
    >
      <mesh>
        <sphereGeometry args={[1.38, 48, 48]} />
        <meshBasicMaterial
          color="#ffdca8"
          transparent
          opacity={0.94 * opacity}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.92, 48, 48]} />
        <meshBasicMaterial
          color="#fff3d6"
          transparent
          opacity={0.22 * opacity}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[3.0, 48, 48]} />
        <meshBasicMaterial
          color="#ff8a3c"
          transparent
          opacity={0.05 * opacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[6.2, 48, 48]} />
        <meshBasicMaterial
          color="#ff6a2a"
          transparent
          opacity={0.006 * opacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, -2]}>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshBasicMaterial
          color="#0a0c12"
          transparent
          opacity={0.22 * opacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
