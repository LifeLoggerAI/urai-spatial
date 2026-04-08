import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
'use client'

import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

type HomeEnvironmentProps = {
  visible?: boolean
  interactive?: boolean
  onSkySelect?: () => void
  onGroundSelect?: () => void
  onOrbSelect?: () => void
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function DistantAtmosphere() {
  const pointsRef = useRef<THREE.Points>(null)

  const data = useMemo(() => {
    const count = 220
    const arr = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const radius = 18 + uraiRandom() * 28
      const angle = uraiRandom() * Math.PI * 2
      const y = 3.5 + uraiRandom() * 8.5
      const x = Math.cos(angle) * radius
      const z = -18 - uraiRandom() * 58

      arr[i * 3 + 0] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
    }

    return arr
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.045) * 0.03
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.08
  })

  return (
    <points ref={pointsRef} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={data.length / 3}
          array={data}
          itemSize={3}
          args={[data, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        sizeAttenuation
        transparent
        opacity={0.78}
        depthWrite={false}
        color="#8eb6ff"
      />
    </points>
  )
}

function HorizonBloom() {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current) return
    const ringMat = ringRef.current.material as THREE.MeshBasicMaterial
    ringMat.opacity = lerp(
      ringMat.opacity,
      0.26 + Math.sin(state.clock.elapsedTime * 0.55) * 0.025,
      0.08
    )
  })

  return (
    <group position={[0, -1.52, -18]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.5, 17.5, 96]} />
        <meshBasicMaterial color="#29507f" transparent opacity={0.78} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.2, 10.5, 96]} />
        <meshBasicMaterial color="#3e6da8" transparent opacity={0.78} depthWrite={false} />
      </mesh>
    </group>
  )
}

function OrbCore({
  interactive,
  onOrbSelect,
}: {
  interactive: boolean
  onOrbSelect?: () => void
}) {
  const orbRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!orbRef.current || !haloRef.current) return

    const t = state.clock.elapsedTime

    orbRef.current.position.y = 0.9 + Math.sin(t * 0.85) * 0.08
    orbRef.current.rotation.y += 0.0035
    orbRef.current.rotation.x = Math.sin(t * 0.28) * 0.06

    const haloMat = haloRef.current.material as THREE.MeshBasicMaterial
    haloMat.opacity = 0.18 + (Math.sin(t * 1.1) + 1) * 0.035
    haloRef.current.scale.setScalar(1.0 + Math.sin(t * 1.35) * 0.035)
  })

  const clickProps = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onOrbSelect?.()
        },
        onPointerDown: (e: ThreeEvent<PointerEvent>) => e.stopPropagation(),
      }
    : {}

  return (
    <group ref={orbRef} position={[0, 0.9, -3.6]}>
      <mesh {...clickProps}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial
          color="#d9ebff"
          emissive="#8cbcff"
          emissiveIntensity={0.9}
          roughness={0.18}
          metalness={0.05}
        />
      </mesh>

      <mesh ref={haloRef} scale={[2.5, 2.5, 2.5]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshBasicMaterial color="#6ea8ff" transparent opacity={0.78} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.86, -0.08]}>
        <ringGeometry args={[0.45, 1.75, 64]} />
        <meshBasicMaterial color="#7fb2ff" transparent opacity={0.78} depthWrite={false} />
      </mesh>

      <pointLight position={[0, 0, 0]} intensity={12} distance={20} color="#8cbcff" />
      <pointLight position={[0, -0.6, 0.6]} intensity={5.5} distance={12} color="#dcecff" />
    </group>
  )
}

export default function HomeEnvironment({
  visible = true,
  interactive = true,
  onSkySelect,
  onGroundSelect,
  onOrbSelect,
}: HomeEnvironmentProps) {
  const rootRef = useRef<THREE.Group>(null)
  const fogPlaneA = useRef<THREE.Mesh>(null)
  const fogPlaneB = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!rootRef.current) return

    const t = state.clock.elapsedTime
    rootRef.current.position.y = Math.sin(t * 0.02) * 0.003

    if (fogPlaneA.current) {
      fogPlaneA.current.position.x = Math.sin(t * 0.08) * 0.38
      const fogMatA = fogPlaneA.current.material as THREE.MeshBasicMaterial
      fogMatA.opacity = 0.16 + Math.sin(t * 0.4) * 0.015
    }

    if (fogPlaneB.current) {
      fogPlaneB.current.position.x = Math.cos(t * 0.06) * -0.45
      const fogMatB = fogPlaneB.current.material as THREE.MeshBasicMaterial
      fogMatB.opacity = 0.11 + Math.cos(t * 0.34) * 0.012
    }
  })

  if (!visible) return null

  const groundEvents = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onGroundSelect?.()
        },
        onPointerDown: (e: ThreeEvent<PointerEvent>) => e.stopPropagation(),
      }
    : {}

  const skyEvents = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          setTimeout(() => { onSkySelect?.() }, 120)
        },
        onPointerDown: (e: ThreeEvent<PointerEvent>) => e.stopPropagation(),
      }
    : {}

  return (
    <group ref={rootRef}>
      <color attach="background" args={['#10233f']} />
      <fog attach="fog" args={['#10233f', 10, 72]} />

      <ambientLight intensity={1.35} color="#7fa2d6" />
      <directionalLight position={[4.5, 7.5, 5]} intensity={1.35} color="#cfe1ff" />
      <directionalLight position={[-7, 3.5, -8]} intensity={1.35} color="#38527d" />

      <mesh {...skyEvents} position={[0, 7, -20]}>
        <sphereGeometry args={[38, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshBasicMaterial
          color="#081325"
          side={THREE.BackSide}
          transparent
          opacity={0.78}
          depthWrite={false}
        />
      </mesh>

      <DistantAtmosphere />

      <mesh position={[0, 4.5, -25]}>
        <sphereGeometry args={[42, 48, 48, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
        <meshBasicMaterial color="#16365b" transparent opacity={0.78} depthWrite={false} />
      </mesh>

      <mesh position={[0, 1.4, -22]}>
        <sphereGeometry args={[42, 64, 64, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
        <meshBasicMaterial color="#3c6ca8" transparent opacity={0.78} depthWrite={false} />
      </mesh>

      <HorizonBloom />

      <group position={[0, -1.7, -4]}>
        <mesh {...groundEvents} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[16, 96]} />
          <meshStandardMaterial color="#07111d" roughness={1} metalness={0} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -2.2]} scale={[1, 1.12, 1]}>
          <circleGeometry args={[9.2, 96]} />
          <meshBasicMaterial color="#103050" transparent opacity={0.78} depthWrite={false} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, -3.1]} scale={[1, 1.28, 1]}>
          <ringGeometry args={[3.2, 7.8, 96]} />
          <meshBasicMaterial color="#29507f" transparent opacity={0.78} depthWrite={false} />
        </mesh>
      </group>

      <mesh ref={fogPlaneA} position={[0, -0.85, -7.5]} rotation={[-0.18, 0, 0]}>
        <planeGeometry args={[22, 4.8]} />
        <meshBasicMaterial color="#22446d" transparent opacity={0.78} depthWrite={false} />
      </mesh>

      <mesh ref={fogPlaneB} position={[0, -0.35, -12.5]} rotation={[-0.12, 0, 0]}>
        <planeGeometry args={[28, 7]} />
        <meshBasicMaterial color="#193454" transparent opacity={0.78} depthWrite={false} />
      </mesh>

      <OrbCore interactive={interactive} onOrbSelect={onOrbSelect} />
    </group>
  )
}
