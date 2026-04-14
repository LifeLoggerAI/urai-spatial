import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

type HomeEnvironmentProps = {
  visible: boolean
  interactive?: boolean
  dim?: number
  phase?: string
  opacity?: number
  worldScale?: number
  yOffset?: number
  zOffset?: number
  onSkySelect?: () => void
  onGroundSelect?: () => void
  onOrbSelect?: () => void
}

export default function HomeEnvironment({
  visible,
  interactive = false,
  dim = 0,
  phase: _phase,
  opacity: opacityProp = 1,
  worldScale = 1,
  yOffset = 0,
  zOffset = 0,
  onSkySelect,
  onGroundSelect,
  onOrbSelect,
}: HomeEnvironmentProps) {
  const t = String(_phase || '').toUpperCase() === 'ASCENT' ? 1 : 0
  const rootRef = useRef<THREE.Group>(null)
  const orbRef = useRef<THREE.Group>(null)

  const opacity = Math.max(0, Math.min(1, opacityProp * (1 - dim)))
  const skyColor = useMemo(() => new THREE.Color('#07111f'), [])
  const horizonColor = useMemo(() => new THREE.Color('#142033'), [])
  const groundColor = useMemo(() => new THREE.Color('#1b1612'), [])

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime

    if (rootRef.current) {
      rootRef.current.position.y = yOffset + Math.sin(t * 0.08) * 0.03
      rootRef.current.position.z = zOffset
      rootRef.current.scale.setScalar(worldScale)
    }

    if (orbRef.current) {
      const phaseName = String(_phase || "").toUpperCase()
      const isHome = phaseName === "HOME"
      const isAscent = phaseName === "ASCENT"
      const ascentT = isAscent ? Math.min(1, elapsed * 0.6) : 0
      orbRef.current.position.set(
        isHome ? 0.14 : 0.14 + ascentT * 0.08,
        isHome ? 0.99 : 0.99 - ascentT * 0.22,
        isHome ? -0.16 : -0.16 - ascentT * 1.35
      )
      orbRef.current.scale.setScalar(isHome ? 1.11 : 1.11 - ascentT * 0.10)
      orbRef.current.rotation.y += 0.0025
      orbRef.current.scale.setScalar(isHome ? 1.10 : 1.10 - ascentT * 0.10)
    }
  })

  if (!visible) return null

  return (
    <group ref={rootRef} scale={[worldScale, worldScale, worldScale]} position={[0, yOffset, zOffset]}>
      <fog attach="fog" args={['#0b1424', 8, 28]} />

      <mesh position={[0, 4, -8]}>
        <sphereGeometry args={[24, 48, 48]} />
        <meshStandardMaterial
          color={skyColor}
          side={THREE.BackSide}
          transparent
            opacity={0.42 * opacity}
          depthWrite={false}
        />
      </mesh>

        <mesh position={[0, 0.6, -11.5]} scale={[1.2, 0.36, 1]}>
        <sphereGeometry args={[18, 48, 48]} />
        <meshStandardMaterial
          color={"#1f2f4d"}
          side={THREE.BackSide}
          transparent
            opacity={(0.55 - t * 0.12) * opacity}
          depthWrite={false}
        />
      </mesh>

      <mesh
            position={[0.18, 1.02, -0.18]}
        rotation={[-0.28, 0, 0]}
        onClick={interactive ? () => onGroundSelect?.() : undefined}
      >
        <sphereGeometry args={[6.2, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial
          color={"#0a0f1f"}
          roughness={0.96}
          metalness={0.02}
          transparent
              opacity={(0.42 - t * 0.50) * opacity}
        />
      </mesh>

        {/* === HORIZON RING (depth cue) === */}
        <mesh position={[0.03, 0.51, -10.9]} rotation={[-Math.PI / 2, 0.01, 0]}>
            <ringGeometry args={[6.1, 9.8, 96]} />
          <meshBasicMaterial
            color="#284472"
            transparent
              opacity={(0.55 - t * 0.65) * opacity}
            depthWrite={false}
          />
        </mesh>

        {/* === MID DEPTH LAYER === */}
        <mesh position={[0.04, -0.44, -4.0]} rotation={[-Math.PI / 2, 0.015, 0]}>
          <ringGeometry args={[2.8, 5.8, 96]} />
          <meshBasicMaterial
            color="#173055"
            transparent
            opacity={0.08 * opacity}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0, -0.95, -0.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 1.75, 64]} />
          <meshStandardMaterial
            color="#000000"
            transparent
              opacity={(0.62 - t * 0.18) * opacity}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0.02, -0.93, -0.84]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.03, 0.18, 48]} />
          <meshStandardMaterial
            color="#000000"
            transparent
              opacity={0.58 * opacity}
            depthWrite={false}
          />
        </mesh>

      <group
        ref={orbRef}
          position={[0.04 + t * 0.22, 0.74 - t * 0.18, -1.06 - t * 2.45]}
        onClick={interactive ? () => onOrbSelect?.() : undefined}
      >
        <mesh>
          <sphereGeometry args={[0.58, 48, 48]} />
          <meshStandardMaterial
            color="#f6d19a"
            emissive="#ffb45e"
              emissiveIntensity={2.8}
            roughness={0.28}
            metalness={0.04}
            transparent
            opacity={0.92 * opacity}
          />
        </mesh>

        <mesh scale={1.45}>
          <sphereGeometry args={[0.58, 40, 40]} />
          <meshStandardMaterial
            color="#ff9b47"
            transparent
            opacity={0.012 * opacity}
            depthWrite={false}
          />
        </mesh>
      </group>

      <mesh position={[0, 0.18, -1.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.72, 48]} />
        <meshStandardMaterial
          color="#ffb46d"
          transparent
          opacity={0.22 * opacity}
          depthWrite={false}
        />
      </mesh>

      <mesh
        position={[0, -0.15, -4.8]}
        onClick={interactive ? () => onSkySelect?.() : undefined}
      >
        <sphereGeometry args={[10.5, 40, 40]} />
        <meshStandardMaterial
          color="#9cb7d8"
          side={THREE.BackSide}
          transparent
          opacity={0.05 * opacity}
          depthWrite={false}
        />
      </mesh>

      <ambientLight intensity={0.9} />
      <directionalLight position={[2.5, 4.5, 3]} intensity={1.45} color="#ffd6b0" />
      <directionalLight position={[-4, 2, -3]} intensity={0.28} color="#7fa4d8" />
        <pointLight position={[0.18, 1.02, -0.18]} intensity={4.2} distance={30} color="#ffd8a8" />
    </group>
  )
}
