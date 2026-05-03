"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"

export type LifeMapStar = { id: string; x: number; y: number; z: number; r: number; color: string; tone: string; soft: number; sort: number; major?: boolean }

type StarNode = LifeMapStar & { position: [number, number, number] }

export default function Starfield(props: {
  visible: boolean
  stars?: Array<{ id: string; position: [number, number, number]; size?: number; color?: string }>
  selectedStarId: string | null
  onStarClick: (id: string, position: [number, number, number]) => void
  interactive?: boolean
  opacity?: number
  worldScale?: number
  yOffset?: number
  zOffset?: number
  collapseToSelected?: boolean
  focusSuppression?: number
  lifeMapStars?: LifeMapStar[]
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const tRef = useRef(0)

  const fallbackMajor = useMemo<StarNode[]>(() => {
    const tones = ["focus", "grief", "joy", "tense", "neutral", "awe", "recovery", "calm"]
    return Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2
      const z = -170 - i * 11
      return {
        id: `major-${i}`,
        x: Math.cos(a) * (14 + (i % 3) * 4),
        y: 16 + Math.sin(a * 1.5) * 7,
        z,
        r: 0.95,
        color: ["#9fd3ff", "#c6a7ff", "#ffd18e", "#7ce2ff", "#ff9fb8"][i % 5],
        tone: tones[i % tones.length],
        soft: 0.95,
        sort: i,
        major: true,
        position: [Math.cos(a) * (14 + (i % 3) * 4), 16 + Math.sin(a * 1.5) * 7, z],
      }
    })
  }, [])

  const background = useMemo<StarNode[]>(() => Array.from({ length: 70 }, (_, i) => {
    const x = ((i * 37) % 97) - 48
    const y = 4 + ((i * 23) % 38)
    const z = -120 - ((i * 41) % 190)
    return { id: `bg-${i}`, x, y, z, r: 0.08 + ((i * 13) % 9) * 0.01, color: "#8ea3c7", tone: "neutral", soft: 0.72, sort: i + 100, position: [x, y, z] }
  }), [])

  const passedMajors = (props.lifeMapStars ?? []).filter((s) => s.major).map((s, i) => ({
    id: s.id,
    x: s.x, y: s.y, z: s.z, r: s.r,
    color: s.color,
    tone: s.tone,
    soft: s.soft,
    sort: s.sort,
    major: true,
    position: [s.x, s.y, s.z] as [number, number, number],
  }))
  const mappedBackground = (props.lifeMapStars ?? []).filter((s) => !s.major).map((s) => ({
    ...s, major: false, position: [s.x, s.y, s.z] as [number, number, number],
  }))

  const positionalMajors = (props.stars ?? []).map((s, i) => ({
    id: s.id,
    x: s.position[0], y: s.position[1] + 15, z: s.position[2] * 12 - 170,
    r: (s.size ?? 0.13) * 7,
    color: s.color ?? "#9fd3ff",
    tone: "focus",
    soft: 1,
    sort: i,
    major: true,
    position: [s.position[0], s.position[1] + 15, s.position[2] * 12 - 170] as [number, number, number],
  }))

  const majors = passedMajors.length > 0 ? passedMajors : (positionalMajors.length > 0 ? positionalMajors : fallbackMajor)
  const allStars = [...(mappedBackground.length > 0 ? mappedBackground : background), ...majors]

  const links = useMemo(() => majors.slice(1).map((s, i) => [majors[i], s] as const), [majors])

  useFrame((_, d) => { tRef.current += d })
  if (!props.visible) return null

  const selected = allStars.find((s) => s.id === props.selectedStarId) ?? null

  return <group position={[0, props.yOffset ?? 0, props.zOffset ?? 0]} scale={props.worldScale ?? 1}>
    {links.map(([a, b], i) => <line key={`link-${i}`}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array([...a.position, ...b.position]), 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#6f8bc6" transparent opacity={0.25 * (props.opacity ?? 1)} depthWrite={false} />
    </line>)}

    {allStars.map((star, idx) => {
      const drift = tRef.current
      const position: [number, number, number] = [star.position[0] + Math.sin(drift * 0.14 + idx) * 0.22, star.position[1] + Math.cos(drift * 0.2 + idx) * 0.18, star.position[2]]
      const isSelected = props.selectedStarId === star.id
      const isHovered = hoveredId === star.id
      const dim = selected && !isSelected ? 0.42 : 1
      const rad = star.major ? star.r * (isSelected ? 1.8 : isHovered ? 1.35 : 1) : star.r
      return <group key={star.id}>
        <mesh
          position={position}
          onPointerOver={() => setHoveredId(star.id)}
          onPointerOut={() => setHoveredId(null)}
          onPointerDown={(e) => { if (!props.interactive || !star.major) return; e.stopPropagation(); props.onStarClick(star.id, star.position) }}>
          <sphereGeometry args={[rad, 16, 16]} />
          <meshBasicMaterial color={isSelected ? "#ffe27a" : star.color} transparent opacity={(props.opacity ?? 1) * dim * (star.major ? 0.85 : 0.3)} depthWrite={false} toneMapped={false} />
        </mesh>
        {star.major ? <mesh position={position} renderOrder={2}>
          <sphereGeometry args={[rad * 1.9, 14, 14]} />
          <meshBasicMaterial color={star.color} transparent opacity={isSelected ? 0.42 : 0.28} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh> : null}
        {star.major && (isSelected || isHovered) ? <mesh position={[position[0], position[1] + 1.3, position[2]]}>
          <planeGeometry args={[2.4, 0.42]} />
          <meshBasicMaterial color="#b9d7ff" transparent opacity={0.72} />
        </mesh> : null}
      </group>
    })}
  </group>
}
