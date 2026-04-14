import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

type ReplaySceneProps = {
  visible: boolean
  opacity?: number
  driftZ?: number
  replayGroupScale?: number
}

export default function ReplayScene({
  visible,
  opacity = 1,
  driftZ = 0,
  replayGroupScale = 1,
}: ReplaySceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const hazeRef = useRef<THREE.Mesh>(null)

  const targetScale = useMemo(
    () => new THREE.Vector3(replayGroupScale, replayGroupScale, replayGroupScale),
    [replayGroupScale]
  )

  useFrame((state, delta) => {
    if (!groupRef.current) return

    const t = state.clock.elapsedTime
    const g = groupRef.current

    g.position.z = driftZ - 0.35
    g.scale.lerp(targetScale, 1 - Math.exp(-delta * 2.2))

    // STILLNESS LOCK: removed rotation
    // STILLNESS LOCK: removed rotation

    if (shellRef.current) {
      // STILLNESS LOCK: removed shell rotation
    }

    if (hazeRef.current) {
      // STILLNESS LOCK: removed haze rotation
    }
  })

  if (!visible) return null

  return (
    <group ref={groupRef}>
      <mesh ref={shellRef}>
        <sphereGeometry args={[10, 48, 48]} />
        <meshBasicMaterial
          color="#05070a"
          transparent
          opacity={0.22 * opacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[6.4, 40, 40]} />
        <meshBasicMaterial
          color="#120d1f"
          transparent
          opacity={0.20 * opacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={hazeRef} position={[0, 0, 0.7]}>
        <sphereGeometry args={[4.6, 32, 32]} />
        <meshBasicMaterial
          color="#3a235c"
          transparent
          opacity={0.05 * opacity}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.3, 40, 40]} />
        <meshBasicMaterial
          color="#8d61ff"
          transparent
          opacity={0.20 * opacity}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.15, 48, 48]} />
        <meshBasicMaterial
          color="#d7c2ff"
          transparent
          opacity={0.96 * opacity}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.9, 48, 48]} />
        <meshBasicMaterial
          color="#a97cff"
          transparent
          opacity={0.15 * opacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
