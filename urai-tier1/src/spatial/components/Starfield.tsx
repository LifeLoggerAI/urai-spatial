"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"

type StarNode = { id: string; position: [number, number, number]; size: number; featured?: boolean; color?: string }

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
}) {
  const generatedStars = useMemo<StarNode[]>(() => Array.from({ length: 110 }, (_, i) => ({
    id: `field-star-${i}`,
    position: [((i * 17) % 23 - 11) * 0.8, (((i * 13) % 19) - 9) * 0.5 + 1.5, -2 - ((i * 29) % 40) * 0.4],
    size: 0.02 + ((i * 7) % 10) * 0.008,
    color: "#8ea3c7",
  })), [])

  const allStars = [...generatedStars, ...(props.stars ?? []).map((s) => ({ ...s, size: s.size ?? 0.13, featured: true }))]
  const phaseRef = useRef(0)
  useFrame((_, d) => { phaseRef.current += d })

  if (!props.visible) return null

  return (
    <group position={[0, props.yOffset ?? 0, props.zOffset ?? 0]} scale={props.worldScale ?? 1}>
      {allStars.map((star, idx) => {
        const isSelected = props.selectedStarId === star.id
        const drift = phaseRef.current
        const position: [number, number, number] = [
          star.position[0] + Math.sin(drift * 0.2 + idx) * 0.04,
          star.position[1] + Math.cos(drift * 0.26 + idx) * 0.06,
          star.position[2],
        ]

        return (
          <mesh key={star.id} position={position} onPointerDown={(e) => { if (!props.interactive) return; e.stopPropagation(); props.onStarClick(star.id, star.position) }}>
            <sphereGeometry args={[isSelected ? star.size * 2.6 : star.size * (star.featured ? 1.8 : 1.1), 16, 16]} />
            <meshBasicMaterial color={isSelected ? "#ffe27a" : star.color} transparent opacity={(props.opacity ?? 1) * (star.featured ? 0.95 : 0.6)} />
          </mesh>
        )
      })}
    </group>
  )
}
