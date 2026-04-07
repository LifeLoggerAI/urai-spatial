'use client'

import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  PRIMARY_STAR_DEPTH,
  STARFIELD_DEPTH_BANDS,
  STARFIELD_IDLE,
  STARFIELD_PHASE_ALPHA,
  type SpatialPhase,
} from '@/lib/uraiCanon/starfieldDepth'

type Vec3Tuple = [number, number, number]

type PositionLike =
  | Vec3Tuple
  | { x?: number; y?: number; z?: number }
  | undefined

type LifeMapStarLike = {
  id?: string
  x?: number
  y?: number
  z?: number
  position?: PositionLike
  size?: number
  radius?: number
  intensity?: number
  importance?: number
  color?: string
  title?: string
}

type DepthFieldProps = {
  stars?: LifeMapStarLike[]
  visible?: boolean
  phase?: SpatialPhase | string
  mode?: SpatialPhase | string
  active?: boolean
  selectedStarId?: string | null
  hoveredStarId?: string | null
  opacity?: number
  interactive?: boolean
  onStarClick?: (id: string) => void
  onStarHover?: (id: string | null) => void
}

type DustNode = {
  position: Vec3Tuple
  size: number
}

type PrimaryNode = {
  id: string
  position: Vec3Tuple
  radius: number
  color: string
  emphasis: number
  interactive: boolean
}

function createSeededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 4294967296
  }
}

function resolvePhase(input?: string): SpatialPhase {
  if (input === 'home' || input === 'lifemap' || input === 'focus' || input === 'replay') return input
  return 'lifemap'
}

function resolvePosition(star: LifeMapStarLike, fallbackIndex: number): Vec3Tuple {
  if (Array.isArray(star.position) && star.position.length >= 3) {
    return [
      Number(star.position[0] ?? 0),
      Number(star.position[1] ?? 0),
      Number(star.position[2] ?? -(30 + fallbackIndex)),
    ]
  }
  if (star.position && typeof star.position === 'object') {
    return [
      Number((Array.isArray(star.position) ? star.position[0] : star.position?.x) ?? 0),
      Number((Array.isArray(star.position) ? star.position[1] : star.position?.y) ?? 0),
      Number((Array.isArray(star.position) ? star.position[2] : star.position?.z) ?? -(30 + fallbackIndex)),
    ]
  }
  return [
    Number(star.x ?? 0),
    Number(star.y ?? 0),
    Number(star.z ?? -(30 + fallbackIndex)),
  ]
}

function buildDustNodes(
  count: number,
  spreadX: number,
  spreadY: number,
  zMin: number,
  zMax: number,
  pointSize: number,
): DustNode[] {
  const rand = createSeededRandom(count * 97 + spreadX * 13 + spreadY * 17)
  const nodes: DustNode[] = []
  for (let i = 0; i < count; i += 1) {
    const x = (rand() - 0.5) * spreadX * 2
    const y = (rand() - 0.5) * spreadY * 2
    const z = zMin + rand() * (zMax - zMin)
    const size = pointSize * (0.65 + rand() * 0.9)
    nodes.push({ position: [x, y, z], size })
  }
  return nodes
}

function buildPrimaryNodes(stars: LifeMapStarLike[] | undefined, interactive: boolean): PrimaryNode[] {
  if (!stars || stars.length === 0) {
    return [
      { id: 'anchor-1', position: [-8.5, 6.4, -72], radius: 0.28, color: '#d8dde8', emphasis: 0.92, interactive },
      { id: 'anchor-2', position: [-5.2, -1.0, -58], radius: 0.34, color: '#cfd6e4', emphasis: 1.00, interactive },
      { id: 'anchor-3', position: [1.5, 3.8, -66], radius: 0.42, color: '#dce4f2', emphasis: 1.05, interactive },
      { id: 'anchor-4', position: [6.6, 0.2, -54], radius: 0.36, color: '#d7dce8', emphasis: 0.98, interactive },
      { id: 'anchor-5', position: [9.0, 6.8, -80], radius: 0.24, color: '#c9d3e6', emphasis: 0.88, interactive },
      { id: 'anchor-6', position: [0.0, -6.8, -38], radius: 0.30, color: '#c7d0dd', emphasis: 0.95, interactive },
      { id: 'anchor-7', position: [2.7, -2.8, -44], radius: 0.22, color: '#dfe6f2', emphasis: 0.84, interactive },
      { id: 'anchor-8', position: [-2.0, 1.7, -49], radius: 0.26, color: '#d5deee', emphasis: 0.87, interactive },
    ]
  }

  return stars.slice(0, 80).map((star, index) => {
    const pos = resolvePosition(star, index)
    const rawImportance = Number(star.importance ?? star.intensity ?? 0.7)
    const emphasis = THREE.MathUtils.clamp(rawImportance, 0.45, 1.25)
    const rawSize = Number(star.radius ?? star.size ?? PRIMARY_STAR_DEPTH.baseRadius)
    const radius = THREE.MathUtils.clamp(rawSize * (0.7 + emphasis * 0.75), 0.12, 0.48)
    return {
      id: String(star.id ?? `star-${index}`),
      position: [
        pos[0],
        pos[1],
        THREE.MathUtils.clamp(pos[2], PRIMARY_STAR_DEPTH.zMin, PRIMARY_STAR_DEPTH.zMax),
      ],
      radius,
      color: star.color ?? '#d6dce6',
      emphasis,
      interactive,
    }
  })
}

function DustLayer({
  nodes,
  opacity,
  materialSize,
}: {
  nodes: DustNode[]
  opacity: number
  materialSize: number
}) {
  const positions = useMemo(() => {
    const values = new Float32Array(nodes.length * 3)
    for (let i = 0; i < nodes.length; i += 1) {
      values[i * 3 + 0] = nodes[i].position[0]
      values[i * 3 + 1] = nodes[i].position[1]
      values[i * 3 + 2] = nodes[i].position[2]
    }
    return values
  }, [nodes])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#c7d3ea"
        size={materialSize}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  )
}

function PrimaryLayer({
  nodes,
  selectedStarId,
  hoveredStarId,
  phase,
  onStarClick,
  onStarHover,
}: {
  nodes: PrimaryNode[]
  selectedStarId?: string | null
  hoveredStarId?: string | null
  phase: SpatialPhase
  onStarClick?: (id: string) => void
  onStarHover?: (id: string | null) => void
}) {
  return (
    <>
      {nodes.map((node) => {
        const selected = node.id === selectedStarId
        const hovered = node.id === hoveredStarId
        const emphasis =
          selected ? 1.55 :
          hovered ? 1.22 :
          phase === 'focus' ? Math.max(0.72, node.emphasis * 0.84) :
          node.emphasis

        const scale = node.radius * emphasis
        const alpha =
          selected ? 0.98 :
          hovered ? 0.90 :
          phase === 'replay' ? 0.58 :
          phase === 'focus' ? 0.76 :
          0.84

        return (
          <group key={node.id} position={node.position}>
            <mesh
              onClick={node.interactive && onStarClick ? () => onStarClick(node.id) : undefined}
              onPointerOver={node.interactive && onStarHover ? () => onStarHover(node.id) : undefined}
              onPointerOut={node.interactive && onStarHover ? () => onStarHover(null) : undefined}
            >
              <sphereGeometry args={[scale, 18, 18]} />
              <meshBasicMaterial color={node.color} transparent opacity={alpha} toneMapped={false} />
            </mesh>
            <mesh scale={[2.2, 2.2, 2.2]}>
              <sphereGeometry args={[scale, 14, 14]} />
              <meshBasicMaterial
                color={node.color}
                transparent
                opacity={alpha * 0.13}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

export default function Starfield({
  stars,
  visible = true,
  phase,
  mode,
  active = true,
  selectedStarId = null,
  hoveredStarId = null,
  opacity = 1,
  interactive = true,
  onStarClick,
  onStarHover,
}: DepthFieldProps) {
  const resolvedPhase = resolvePhase(String(phase ?? mode ?? 'lifemap'))
  const rootRef = useRef<THREE.Group>(null)
  const farRef = useRef<THREE.Group>(null)
  const midRef = useRef<THREE.Group>(null)
  const nearRef = useRef<THREE.Group>(null)

  const farNodes = useMemo(() => {
    const spec = STARFIELD_DEPTH_BANDS[0]
    return buildDustNodes(spec.count, spec.spreadX, spec.spreadY, spec.zMin, spec.zMax, spec.pointSize)
  }, [])

  const midNodes = useMemo(() => {
    const spec = STARFIELD_DEPTH_BANDS[1]
    return buildDustNodes(spec.count, spec.spreadX, spec.spreadY, spec.zMin, spec.zMax, spec.pointSize)
  }, [])

  const nearNodes = useMemo(() => {
    const spec = STARFIELD_DEPTH_BANDS[2]
    return buildDustNodes(spec.count, spec.spreadX, spec.spreadY, spec.zMin, spec.zMax, spec.pointSize)
  }, [])

  const primaryNodes = useMemo(() => buildPrimaryNodes(stars, interactive), [stars, interactive])

  useFrame((state, delta) => {
    const root = rootRef.current
    const far = farRef.current
    const mid = midRef.current
    const near = nearRef.current
    if (!root || !far || !mid || !near) return

    const phaseAlpha = STARFIELD_PHASE_ALPHA[resolvedPhase] * (visible && active ? 1 : 0)
    root.visible = phaseAlpha > 0.001

    const t = state.clock.getElapsedTime()
    const cam = state.camera.position

    const rootTargetY =
      resolvedPhase === 'home' ? 1.0 :
      resolvedPhase === 'focus' ? 0.2 :
      resolvedPhase === 'replay' ? -0.4 :
      0.0

    root.position.x = THREE.MathUtils.lerp(root.position.x, Math.sin(t * 0.08) * STARFIELD_IDLE.xAmp, Math.min(1, delta * 1.4))
    root.position.y = THREE.MathUtils.lerp(root.position.y, rootTargetY + Math.cos(t * 0.12) * STARFIELD_IDLE.yAmp, Math.min(1, delta * 1.3))
    root.position.z = THREE.MathUtils.lerp(root.position.z, Math.sin(t * 0.05) * STARFIELD_IDLE.zAmp, Math.min(1, delta * 0.9))

    far.position.x = THREE.MathUtils.lerp(far.position.x, -cam.x * STARFIELD_DEPTH_BANDS[0].parallax, Math.min(1, delta * 1.0))
    far.position.y = THREE.MathUtils.lerp(far.position.y, -cam.y * STARFIELD_DEPTH_BANDS[0].parallax + Math.sin(t * STARFIELD_DEPTH_BANDS[0].drift) * 0.22, Math.min(1, delta * 1.0))

    mid.position.x = THREE.MathUtils.lerp(mid.position.x, -cam.x * STARFIELD_DEPTH_BANDS[1].parallax, Math.min(1, delta * 1.3))
    mid.position.y = THREE.MathUtils.lerp(mid.position.y, -cam.y * STARFIELD_DEPTH_BANDS[1].parallax + Math.sin(t * STARFIELD_DEPTH_BANDS[1].drift) * 0.18, Math.min(1, delta * 1.3))

    near.position.x = THREE.MathUtils.lerp(near.position.x, -cam.x * STARFIELD_DEPTH_BANDS[2].parallax, Math.min(1, delta * 1.8))
    near.position.y = THREE.MathUtils.lerp(near.position.y, -cam.y * STARFIELD_DEPTH_BANDS[2].parallax + Math.sin(t * STARFIELD_DEPTH_BANDS[2].drift) * 0.14, Math.min(1, delta * 1.8))
  })

  if (!visible || !active) return null

  const phaseAlpha = STARFIELD_PHASE_ALPHA[resolvedPhase] * opacity

  return (
    <group ref={rootRef}>
      <group ref={farRef}>
        <DustLayer
          nodes={farNodes}
          opacity={STARFIELD_DEPTH_BANDS[0].opacity * phaseAlpha}
          materialSize={STARFIELD_DEPTH_BANDS[0].pointSize * 2.0}
        />
      </group>

      <group ref={midRef}>
        <DustLayer
          nodes={midNodes}
          opacity={STARFIELD_DEPTH_BANDS[1].opacity * phaseAlpha}
          materialSize={STARFIELD_DEPTH_BANDS[1].pointSize * 2.0}
        />
      </group>

      <group ref={nearRef}>
        <DustLayer
          nodes={nearNodes}
          opacity={STARFIELD_DEPTH_BANDS[2].opacity * phaseAlpha}
          materialSize={STARFIELD_DEPTH_BANDS[2].pointSize * 2.0}
        />
        <PrimaryLayer
          nodes={primaryNodes}
          selectedStarId={selectedStarId}
          hoveredStarId={hoveredStarId}
          phase={resolvedPhase}
          onStarClick={onStarClick}
          onStarHover={onStarHover}
        />
      </group>
    </group>
  )
}
