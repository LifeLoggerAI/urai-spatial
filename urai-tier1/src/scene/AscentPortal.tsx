'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

const ASCENT_TOTAL_MS = 2240
const COMMIT_END_MS = 300
const LIFT_END_MS = 900
const TUNNEL_END_MS = 1550
const REVEAL_END_MS = 2050

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

function AscentStars() {
  const ref = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const count = 560
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const radius = 0.38 + seeded(i + 10) * 7.2
      const angle = seeded(i + 22) * Math.PI * 2
      const depth = -4 - seeded(i + 55) * 36
      const lift = seeded(i + 88) * 7.4
      const laneBias = seeded(i + 122) > 0.82 ? 1.6 : 1

      positions[i * 3] = Math.cos(angle) * radius * laneBias
      positions[i * 3 + 1] = -1.9 + lift
      positions[i * 3 + 2] = depth + Math.sin(angle) * radius * 0.24

      colors[i * 3] = 0.5 + seeded(i + 100) * 0.28
      colors[i * 3 + 1] = 0.74 + seeded(i + 200) * 0.24
      colors[i * 3 + 2] = 1
      sizes[i] = 0.7 + seeded(i + 300) * 0.55
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])

  const startedAt = useRef<number | null>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    if (startedAt.current === null) startedAt.current = clock.elapsedTime

    const elapsedMs = (clock.elapsedTime - startedAt.current) * 1000
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const tunnel = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, TUNNEL_END_MS))
    const reveal = easeOutCubic(phaseProgress(elapsedMs, TUNNEL_END_MS, REVEAL_END_MS))
    const t = clock.elapsedTime

    ref.current.position.y = -0.22 - lift * 0.34 + reveal * 0.18
    ref.current.position.z = -2.8 + tunnel * 2.2 + Math.sin(t * 0.16) * 0.08
    ref.current.rotation.z = Math.sin(t * 0.24) * 0.018
    ref.current.rotation.y = Math.sin(t * 0.12) * 0.012

    const material = ref.current.material as THREE.PointsMaterial
    material.opacity = 0.12 + lift * 0.18 + tunnel * 0.24 + reveal * 0.28
    material.size = 0.025 + reveal * 0.008
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.025} vertexColors transparent opacity={0.12} depthWrite={false} />
    </points>
  )
}

function MemorySeedNodes() {
  const group = useRef<THREE.Group>(null)
  const nodes = useMemo(
    () =>
      Array.from({ length: 13 }).map((_, index) => ({
        id: `memory-seed-${index}`,
        x: (seeded(index + 300) - 0.5) * 4.6,
        y: 0.35 + seeded(index + 340) * 2.7,
        z: -8.4 - seeded(index + 380) * 7.2,
        scale: 0.025 + seeded(index + 420) * 0.04,
        delay: seeded(index + 460) * 0.38,
      })),
    [],
  )

  const startedAt = useRef<number | null>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    if (startedAt.current === null) startedAt.current = clock.elapsedTime

    const elapsedMs = (clock.elapsedTime - startedAt.current) * 1000
    const reveal = easeOutExpo(phaseProgress(elapsedMs, TUNNEL_END_MS, REVEAL_END_MS))
    group.current.children.forEach((child, index) => {
      const node = nodes[index]
      const local = clamp01((reveal - node.delay) / 0.62)
      const eased = easeOutCubic(local)
      child.scale.setScalar(node.scale * eased)
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      material.opacity = 0.86 * eased
    })
  })

  return (
    <group ref={group}>
      {nodes.map((node) => (
        <mesh key={node.id} position={[node.x, node.y, node.z]} scale={0.001}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color="#dff8ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

function PortalRing({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const startedAt = useRef<number | null>(null)
  const baseRadius = 1.22 + index * 0.52
  const baseDepth = -4.6 - index * 1.92
  const opacity = Math.max(0.07, 0.34 - index * 0.034)

  useFrame(({ clock }) => {
    if (!ref.current) return
    if (startedAt.current === null) startedAt.current = clock.elapsedTime

    const elapsedMs = (clock.elapsedTime - startedAt.current) * 1000
    const commit = easeOutCubic(phaseProgress(elapsedMs, 0, COMMIT_END_MS))
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const tunnel = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, TUNNEL_END_MS))
    const reveal = easeOutCubic(phaseProgress(elapsedMs, TUNNEL_END_MS, REVEAL_END_MS))
    const settle = easeOutCubic(phaseProgress(elapsedMs, REVEAL_END_MS, ASCENT_TOTAL_MS))
    const t = clock.elapsedTime + index * 0.35
    const phasePulse = 1 + Math.sin(t * 0.92) * 0.014
    const expansion = 1 + commit * 0.08 + lift * 0.22 + tunnel * 0.42 - settle * 0.12

    ref.current.scale.setScalar(baseRadius * expansion * phasePulse)
    ref.current.position.y = 0.82 + index * 0.075 + lift * 0.32 + reveal * 0.12
    ref.current.position.z = baseDepth + tunnel * 1.35 + reveal * 0.4
    ref.current.rotation.z = t * (index % 2 === 0 ? 0.024 : -0.018)

    const material = ref.current.material as THREE.MeshBasicMaterial
    material.opacity = opacity * (0.72 + commit * 0.18 + tunnel * 0.24 - reveal * 0.1)
  })

  return (
    <mesh ref={ref} position={[0, 0.82 + index * 0.075, baseDepth]}>
      <torusGeometry args={[1, 0.01, 10, 112]} />
      <meshBasicMaterial
        color={index % 2 === 0 ? '#67e8f9' : '#a78bfa'}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function PortalCore() {
  const glow = useRef<THREE.Mesh>(null)
  const aperture = useRef<THREE.Mesh>(null)
  const startedAt = useRef<number | null>(null)

  useFrame(({ clock }) => {
    if (startedAt.current === null) startedAt.current = clock.elapsedTime
    const elapsedMs = (clock.elapsedTime - startedAt.current) * 1000
    const commit = easeOutCubic(phaseProgress(elapsedMs, 0, COMMIT_END_MS))
    const lift = easeInOutCubic(phaseProgress(elapsedMs, COMMIT_END_MS, LIFT_END_MS))
    const tunnel = easeInOutCubic(phaseProgress(elapsedMs, LIFT_END_MS, TUNNEL_END_MS))
    const reveal = easeOutExpo(phaseProgress(elapsedMs, TUNNEL_END_MS, REVEAL_END_MS))
    const bloomPeak = Math.sin(clamp01((elapsedMs - 1500) / 540) * Math.PI)

    if (glow.current) {
      glow.current.scale.setScalar(1 + commit * 0.08 + lift * 0.2 + tunnel * 0.34 + bloomPeak * 0.28 - reveal * 0.08)
      glow.current.position.y = 1.04 + lift * 0.4 + reveal * 0.14
      const material = glow.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.11 + commit * 0.04 + tunnel * 0.08 + bloomPeak * 0.1 - reveal * 0.04
    }

    if (aperture.current) {
      aperture.current.scale.setScalar(0.88 + commit * 0.08 + lift * 0.18 + tunnel * 0.32 + reveal * 0.18)
      aperture.current.position.y = 1.04 + lift * 0.42 + reveal * 0.2
      const material = aperture.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.1 + lift * 0.08 + tunnel * 0.12 + bloomPeak * 0.12 - reveal * 0.1
    }
  })

  return (
    <>
      <mesh ref={glow} position={[0, 1.04, -8.7]}>
        <sphereGeometry args={[2.28, 64, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={aperture} position={[0, 1.04, -8.08]}>
        <planeGeometry args={[8.2, 8.2]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  )
}

export default function AscentPortal() {
  return (
    <group>
      <PortalCore />

      {Array.from({ length: 7 }).map((_, index) => (
        <PortalRing key={index} index={index} />
      ))}

      <AscentStars />
      <MemorySeedNodes />
    </group>
  )
}
