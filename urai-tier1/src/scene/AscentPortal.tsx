'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

const ASCENT_TOTAL_MS = 2240
const COMMIT_END_MS = 300
const LIFT_END_MS = 900
const RITUAL_END_MS = 1550
const REVEAL_END_MS = 2050

const MOONLIT_SILVER = '#d8e5f4'
const PALE_CYAN = '#aeefff'
const WHITE_GOLD = '#fff1bf'
const BLUE_VIOLET = '#8b7cf6'

function seeded(index: number) {
  const x = Math.sin(index * 9142.173) * 10000
  return x - Math.floor(x)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function phaseProgress(elapsedMs: number, startMs: number, endMs: number) {
  return clamp01((elapsedMs - startMs) / (endMs - startMs))
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function easeOutExpo(value: number) {
  return value === 1 ? 1 : 1 - Math.pow(2, -10 * value)
}

function useAscentClock() {
  const startedAt = useRef<number | null>(null)

  return (elapsedTime: number) => {
    if (startedAt.current === null) startedAt.current = elapsedTime
    return (elapsedTime - startedAt.current) * 1000
  }
}

function AscentStars() {
  const ref = useRef<THREE.Points>(null)
  const getElapsedMs = useAscentClock()

  const geometry = useMemo(() => {
    const count = 260
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const radius = 0.72 + seeded(i + 10) * 7.8
      const angle = seeded(i + 22) * Math.PI * 2
      const depth = -4.5 - seeded(i + 55) * 32
      const lift = seeded(i + 88) * 7.1
      const laneBias = seeded(i + 122) > 0.9 ? 1.28 : 1

      positions[i * 3] = Math.cos(angle) * radius * laneBias
      positions[i * 3 + 1] = -1.82 + lift
      positions[i * 3 + 2] = depth + Math.sin(angle) * radius * 0.16

      colors[i * 3] = 0.74 + seeded(i + 100) * 0.16
      colors[i * 3 + 1] = 0.84 + seeded(i + 200) * 0.12
      colors[i * 3 + 2] = 1
      sizes[i] = 0.55 + seeded(i + 300) * 0.38
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return

    const elapsedMs = getElapsedMs(clock.elapsedTime)
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const ritual = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, RITUAL_END_MS))
    const reveal = easeOutCubic(phaseProgress(elapsedMs, RITUAL_END_MS, REVEAL_END_MS))
    const t = clock.elapsedTime

    ref.current.position.y = -0.16 - lift * 0.18 + reveal * 0.12
    ref.current.position.z = -3.1 + ritual * 0.78 + Math.sin(t * 0.1) * 0.04
    ref.current.rotation.z = Math.sin(t * 0.16) * 0.006
    ref.current.rotation.y = Math.sin(t * 0.08) * 0.006

    const material = ref.current.material as THREE.PointsMaterial
    material.opacity = 0.08 + lift * 0.1 + ritual * 0.12 + reveal * 0.18
    material.size = 0.018 + reveal * 0.004
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.018} vertexColors transparent opacity={0.08} depthWrite={false} />
    </points>
  )
}

function MemorySeedNodes() {
  const group = useRef<THREE.Group>(null)
  const getElapsedMs = useAscentClock()
  const nodes = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, index) => ({
        id: `memory-seed-${index}`,
        x: (seeded(index + 300) - 0.5) * 4.2,
        y: 0.42 + seeded(index + 340) * 2.35,
        z: -8.7 - seeded(index + 380) * 6.4,
        scale: 0.018 + seeded(index + 420) * 0.033,
        delay: seeded(index + 460) * 0.44,
      })),
    [],
  )

  useFrame(({ clock }) => {
    if (!group.current) return

    const elapsedMs = getElapsedMs(clock.elapsedTime)
    const reveal = easeOutExpo(phaseProgress(elapsedMs, RITUAL_END_MS, REVEAL_END_MS))
    group.current.children.forEach((child, index) => {
      const node = nodes[index]
      const local = clamp01((reveal - node.delay) / 0.68)
      const eased = easeOutCubic(local)
      child.scale.setScalar(node.scale * eased)
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      material.opacity = 0.68 * eased
    })
  })

  return (
    <group ref={group}>
      {nodes.map((node) => (
        <mesh key={node.id} position={[node.x, node.y, node.z]} scale={0.001}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color="#f3fbff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

function OrbitalSeal({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null)
  const getElapsedMs = useAscentClock()
  const baseRadius = 1.34 + index * 0.5
  const baseDepth = -4.9 - index * 1.82
  const opacity = Math.max(0.035, 0.18 - index * 0.018)
  const color = index % 3 === 0 ? MOONLIT_SILVER : index % 3 === 1 ? PALE_CYAN : BLUE_VIOLET

  useFrame(({ clock }) => {
    if (!ref.current) return

    const elapsedMs = getElapsedMs(clock.elapsedTime)
    const commit = easeOutCubic(phaseProgress(elapsedMs, 0, COMMIT_END_MS))
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const ritual = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, RITUAL_END_MS))
    const reveal = easeOutCubic(phaseProgress(elapsedMs, RITUAL_END_MS, REVEAL_END_MS))
    const settle = easeOutCubic(phaseProgress(elapsedMs, REVEAL_END_MS, ASCENT_TOTAL_MS))
    const t = clock.elapsedTime + index * 0.35
    const breathingScale = 1 + Math.sin(t * 0.42) * 0.006
    const expansion = 1 + commit * 0.035 + lift * 0.12 + ritual * 0.18 - settle * 0.055

    ref.current.scale.setScalar(baseRadius * expansion * breathingScale)
    ref.current.position.y = 0.74 + index * 0.085 + lift * 0.24 + reveal * 0.12
    ref.current.position.z = baseDepth + ritual * 0.58 + reveal * 0.28
    ref.current.rotation.z = t * (index % 2 === 0 ? 0.006 : -0.005)

    ref.current.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      material.opacity = opacity * (0.78 + commit * 0.12 + ritual * 0.18 - reveal * 0.05)
    })
  })

  return (
    <group ref={ref} position={[0, 0.74 + index * 0.085, baseDepth]}>
      <mesh>
        <torusGeometry args={[1, 0.0055, 8, 144]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI * 0.18]}>
        <torusGeometry args={[0.76, 0.0035, 8, 96, Math.PI * 1.18]} />
        <meshBasicMaterial color={WHITE_GOLD} transparent opacity={opacity * 0.72} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI * 0.32]}>
        <torusGeometry args={[0.52, 0.003, 8, 72, Math.PI * 0.72]} />
        <meshBasicMaterial color={MOONLIT_SILVER} transparent opacity={opacity * 0.56} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function Moonbeam({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const getElapsedMs = useAscentClock()
  const x = (seeded(index + 700) - 0.5) * 4.8
  const z = -6.2 - seeded(index + 730) * 8.5
  const height = 5.4 + seeded(index + 760) * 2.2

  useFrame(({ clock }) => {
    if (!ref.current) return

    const elapsedMs = getElapsedMs(clock.elapsedTime)
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const ritual = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, RITUAL_END_MS))
    const reveal = easeOutCubic(phaseProgress(elapsedMs, RITUAL_END_MS, REVEAL_END_MS))
    const t = clock.elapsedTime

    ref.current.position.y = 1.7 + lift * 0.26 + Math.sin(t * 0.18 + index) * 0.035
    ref.current.scale.y = 1 + ritual * 0.1
    const material = ref.current.material as THREE.MeshBasicMaterial
    material.opacity = (0.025 + lift * 0.025 + ritual * 0.035 - reveal * 0.012) * (index === 0 ? 1.25 : 1)
  })

  return (
    <mesh ref={ref} position={[x, 1.7, z]} rotation={[0, 0, (seeded(index + 790) - 0.5) * 0.08]}>
      <planeGeometry args={[0.18 + seeded(index + 810) * 0.18, height]} />
      <meshBasicMaterial color="#eaf7ff" transparent opacity={0.025} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  )
}

function PlatformReflection() {
  const ref = useRef<THREE.Mesh>(null)
  const getElapsedMs = useAscentClock()

  useFrame(({ clock }) => {
    if (!ref.current) return

    const elapsedMs = getElapsedMs(clock.elapsedTime)
    const commit = easeOutCubic(phaseProgress(elapsedMs, 0, COMMIT_END_MS))
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const ritual = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, RITUAL_END_MS))
    const reveal = easeOutCubic(phaseProgress(elapsedMs, RITUAL_END_MS, REVEAL_END_MS))

    ref.current.scale.setScalar(1 + commit * 0.08 + lift * 0.14 + ritual * 0.1)
    const material = ref.current.material as THREE.MeshBasicMaterial
    material.opacity = 0.055 + commit * 0.07 + lift * 0.035 - reveal * 0.045
  })

  return (
    <mesh ref={ref} position={[0, -0.64, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.82, 2.85, 144]} />
      <meshBasicMaterial color={WHITE_GOLD} transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  )
}

function MistVeil() {
  const ref = useRef<THREE.Mesh>(null)
  const getElapsedMs = useAscentClock()

  useFrame(({ clock }) => {
    if (!ref.current) return

    const elapsedMs = getElapsedMs(clock.elapsedTime)
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const ritual = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, RITUAL_END_MS))
    const reveal = easeOutCubic(phaseProgress(elapsedMs, RITUAL_END_MS, REVEAL_END_MS))
    const t = clock.elapsedTime

    ref.current.position.x = Math.sin(t * 0.08) * 0.08
    ref.current.position.y = 0.1 + lift * 0.16
    ref.current.position.z = -4.4 + ritual * 0.28
    const material = ref.current.material as THREE.MeshBasicMaterial
    material.opacity = 0.055 + lift * 0.04 + ritual * 0.03 - reveal * 0.025
  })

  return (
    <mesh ref={ref} position={[0, 0.1, -4.4]}>
      <planeGeometry args={[10.5, 3.8]} />
      <meshBasicMaterial color="#dbeafe" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  )
}

function PortalCore() {
  const glow = useRef<THREE.Mesh>(null)
  const aperture = useRef<THREE.Mesh>(null)
  const getElapsedMs = useAscentClock()

  useFrame(({ clock }) => {
    const elapsedMs = getElapsedMs(clock.elapsedTime)
    const commit = easeOutCubic(phaseProgress(elapsedMs, 0, COMMIT_END_MS))
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const ritual = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, RITUAL_END_MS))
    const reveal = easeOutExpo(phaseProgress(elapsedMs, RITUAL_END_MS, REVEAL_END_MS))
    const bloomPeak = Math.sin(clamp01((elapsedMs - 1480) / 560) * Math.PI)

    if (glow.current) {
      glow.current.scale.setScalar(1 + commit * 0.045 + lift * 0.12 + ritual * 0.16 + bloomPeak * 0.12 - reveal * 0.04)
      glow.current.position.y = 1.02 + lift * 0.32 + reveal * 0.12
      const material = glow.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.06 + commit * 0.025 + ritual * 0.035 + bloomPeak * 0.04 - reveal * 0.018
    }

    if (aperture.current) {
      aperture.current.scale.setScalar(0.82 + commit * 0.045 + lift * 0.12 + ritual * 0.16 + reveal * 0.1)
      aperture.current.position.y = 1.02 + lift * 0.34 + reveal * 0.18
      const material = aperture.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.045 + lift * 0.035 + ritual * 0.04 + bloomPeak * 0.035 - reveal * 0.045
    }
  })

  return (
    <>
      <mesh ref={glow} position={[0, 1.02, -8.7]}>
        <sphereGeometry args={[2.34, 64, 32]} />
        <meshBasicMaterial color={PALE_CYAN} transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={aperture} position={[0, 1.02, -8.08]}>
        <planeGeometry args={[8.2, 8.2]} />
        <meshBasicMaterial color={WHITE_GOLD} transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  )
}

export default function AscentPortal() {
  return (
    <group>
      <PlatformReflection />
      <MistVeil />
      <PortalCore />

      {Array.from({ length: 6 }).map((_, index) => (
        <OrbitalSeal key={index} index={index} />
      ))}

      {Array.from({ length: 5 }).map((_, index) => (
        <Moonbeam key={index} index={index} />
      ))}

      <AscentStars />
      <MemorySeedNodes />
    </group>
  )
}
