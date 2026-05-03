'use client'

import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type StarInput = {

  id?: string
  x?: number
  y?: number
  z?: number
  position?: [number, number, number]
  color?: string
  size?: number
}

export type LifeMapStar = StarInput

type Props = {
  visible?: boolean
  stars?: StarInput[]
  selectedStarId?: string | null
  onSelectStar?: (id: string) => void
  onHoverStar?: (id: string | null) => void
  focusSuppression?: number
  interactive?: boolean
  opacity?: number
}

type NormalizedStar = {
  id: string
  position: THREE.Vector3
  color: string
  size: number
  depthClass: 'hero' | 'mid' | 'far'
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function hash01(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453123
  return x - Math.floor(x)
}

function pickColor(i: number) {
  const palette = ['#cfe8ff', '#a9dcff', '#d8c8ff', '#ffe7b7', '#9de3ff']
  return palette[i % palette.length]
}

function normalizeStars(input: StarInput[] | undefined): NormalizedStar[] {
  const fallback = [
    { id: 's0', position: new THREE.Vector3(-7.2, -1.7, -1.6), color: '#ffe7b7', size: 0.50, depthClass: 'hero' as const },
    { id: 's1', position: new THREE.Vector3(-4.7, 1.9, 1.4), color: '#d8c8ff', size: 0.64, depthClass: 'hero' as const },
    { id: 's2', position: new THREE.Vector3(0.8, -0.4, -0.4), color: '#a9dcff', size: 0.78, depthClass: 'hero' as const },
    { id: 's3', position: new THREE.Vector3(4.9, -1.0, 2.8), color: '#9de3ff', size: 0.54, depthClass: 'mid' as const },
    { id: 's4', position: new THREE.Vector3(5.7, 2.9, 1.0), color: '#d8c8ff', size: 0.50, depthClass: 'hero' as const },
    { id: 's5', position: new THREE.Vector3(2.4, 4.9, -1.8), color: '#cfe8ff', size: 0.45, depthClass: 'hero' as const },
    { id: 's6', position: new THREE.Vector3(-1.5, 3.8, 3.8), color: '#a9dcff', size: 0.42, depthClass: 'mid' as const },
  ]

  if (!input || input.length === 0) return fallback

  return input.map((s, i) => {
    const pos = Array.isArray(s.position)
      ? new THREE.Vector3(s.position[0], s.position[1], s.position[2])
      : new THREE.Vector3(
          typeof s.x === 'number' ? s.x : (i - input.length / 2) * 2.4,
          typeof s.y === 'number' ? s.y : Math.sin(i * 1.37) * 3.8,
          typeof s.z === 'number' ? s.z : Math.cos(i * 1.91) * 4.6
        )

    const z = pos.z
    const depthClass = z > 4 ? 'far' : z > 1.2 ? 'mid' : 'hero'

    return {
      id: String(s.id ?? ("s" + i)),
      position: pos,
      color: s.color || pickColor(i),
      size: typeof s.size === 'number' ? s.size : depthClass === 'hero' ? 0.58 : depthClass === 'mid' ? 0.34 : 0.20,
      depthClass,
    }
  })
}

function buildPeripheralField(count: number) {
  const pts: Array<{ position: THREE.Vector3; size: number; color: string; opacity: number }> = []
  for (let i = 0; i < count; i++) {
    const r1 = hash01(i + 11)
    const r2 = hash01(i + 29)
    const r3 = hash01(i + 47)
    const sx = hash01(i + 73) > 0.5 ? 1 : -1
    const sy = hash01(i + 97) > 0.5 ? 1 : -1

    const x = sx * (18 + r1 * 50)
    const y = sy * (10 + r2 * 26)
    const z = -46 + r3 * 88

    const depth = clamp((z + 46) / 88, 0, 1)
    const size = 0.03 + (1 - depth) * 0.09
    const opacity = 0.10 + (1 - depth) * 0.24

    pts.push({
      position: new THREE.Vector3(x, y, z),
      size,
      color: i % 7 === 0 ? '#a9dcff' : i % 11 === 0 ? '#d8c8ff' : '#cfe8ff',
      opacity,
    })
  }
  return pts
}

function buildDustField(count: number) {
  const arr: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const r1 = hash01(i + 131)
    const r2 = hash01(i + 157)
    const r3 = hash01(i + 181)
    arr.push(
      new THREE.Vector3(
        (r1 - 0.5) * 210,
        (r2 - 0.5) * 110,
        -96 + r3 * 126
      )
    )
  }
  return arr
}

function buildConnections(stars: NormalizedStar[]) {
  const pairs: Array<[NormalizedStar, NormalizedStar]> = []
  const local = stars.filter((s) => s.depthClass !== 'far')
  for (let i = 0; i < local.length; i++) {
    let bestJ = -1
    let bestD = Number.POSITIVE_INFINITY
    for (let j = 0; j < local.length; j++) {
      if (i === j) continue
      const d = local[i].position.distanceTo(local[j].position)
      if (d < bestD) {
        bestD = d
        bestJ = j
      }
    }
    if (bestJ >= 0 && bestD < 7.6) pairs.push([local[i], local[bestJ]])
  }

  const dedup = new Map<string, [NormalizedStar, NormalizedStar]>()
  for (const pair of pairs) {
    const a = pair[0]
    const b = pair[1]
    dedup.set([a.id, b.id].sort().join('__'), [a, b])
  }
  return Array.from(dedup.values())
}

export default function LifeMapStarfield({
  visible = true,
  stars = [],
  selectedStarId = null,
  onSelectStar,
  onHoverStar,
  focusSuppression = 0,
  interactive = false,
  opacity = 1,
}: Props) {
  const root = useRef<THREE.Group>(null)
  const starData = useMemo(() => normalizeStars(stars), [stars])
  const peripheral = useMemo(() => buildPeripheralField(220), [])
  const dust = useMemo(() => buildDustField(640), [])
  const connections = useMemo(() => buildConnections(starData), [starData])

  useFrame((state, delta) => {
    if (!root.current) return
    const t = state.clock.getElapsedTime()
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, Math.sin(t * 0.09) * 0.04, 1 - Math.exp(-delta * 1.2))
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, Math.cos(t * 0.06) * 0.014, 1 - Math.exp(-delta * 1.0))
    root.current.position.x = THREE.MathUtils.lerp(root.current.position.x, Math.sin(t * 0.07) * 1.4, 1 - Math.exp(-delta * 0.8))
    root.current.position.y = THREE.MathUtils.lerp(root.current.position.y, Math.cos(t * 0.05) * 0.9, 1 - Math.exp(-delta * 0.8))
  })

  const globalOpacity = clamp((1 - focusSuppression * 0.7) * opacity, 0.18, 1)

  return (
    <group ref={root} visible={visible} position={[0, 0, -18]}>
      <mesh position={[0, 0, -54]}>
        <sphereGeometry args={[104, 28, 28]} />
        <meshBasicMaterial color="#04111f" transparent opacity={0.46 * globalOpacity} side={THREE.BackSide} />
      </mesh>

      <mesh position={[0, -14, -28]} rotation={[-0.28, 0, 0]}>
        <circleGeometry args={[66, 72]} />
        <meshBasicMaterial color="#0a1834" transparent opacity={0.16 * globalOpacity} />
      </mesh>

      {dust.map((p, i) => (
        <mesh key={"dust-" + i} position={p.toArray()}>
          <sphereGeometry args={[0.03 + (i % 5) * 0.004, 6, 6]} />
          <meshBasicMaterial color="#8fb8ff" transparent opacity={0.03 * globalOpacity} />
        </mesh>
      ))}

      {peripheral.map((s, i) => (
        <group key={"peripheral-" + i} position={s.position.toArray()}>
          <mesh>
            <sphereGeometry args={[s.size, 8, 8]} />
            <meshBasicMaterial color={s.color} transparent opacity={s.opacity * globalOpacity} />
          </mesh>
          <mesh>
            <sphereGeometry args={[s.size * 3.2, 10, 10]} />
            <meshBasicMaterial color={s.color} transparent opacity={s.opacity * 0.10 * globalOpacity} />
          </mesh>
        </group>
      ))}

      {connections.map(([a, b], i) => (
        <line key={"line-" + i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                a.position.x, a.position.y, a.position.z,
                b.position.x, b.position.y, b.position.z,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#7ea6ff" transparent opacity={0.15 * globalOpacity} />
        </line>
      ))}

      {starData.map((star) => {
        const selected = selectedStarId === star.id
        const depth = star.position.z
        const depthFade = clamp(1 - ((depth + 34) / 68) * 0.46, 0.44, 1)
        const starOpacity = (selected ? 1 : star.depthClass === 'hero' ? 0.95 : star.depthClass === 'mid' ? 0.64 : 0.34) * depthFade * globalOpacity
        const base = star.size * (selected ? 1.16 : 1)
        const halo = base * (selected ? 5.8 : star.depthClass === 'hero' ? 4.4 : star.depthClass === 'mid' ? 3.5 : 2.6)

        return (
          <group
            key={star.id}
            position={star.position.toArray()}
            onPointerOver={() => interactive && onHoverStar && onHoverStar(star.id)}
            onPointerOut={() => interactive && onHoverStar && onHoverStar(null)}
            onClick={() => interactive && onSelectStar && onSelectStar(star.id)}
          >
            <mesh>
              <sphereGeometry args={[base, 16, 16]} />
              <meshBasicMaterial color={star.color} transparent opacity={starOpacity} />
            </mesh>
            <mesh>
              <sphereGeometry args={[halo, 18, 18]} />
              <meshBasicMaterial color={star.color} transparent opacity={starOpacity * (selected ? 0.16 : 0.10)} />
            </mesh>
            {selected ? (
              <mesh>
                <sphereGeometry args={[halo * 1.9, 22, 22]} />
                <meshBasicMaterial color={star.color} transparent opacity={0.06 * globalOpacity} />
              </mesh>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
