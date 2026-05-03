"use client"

import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism"
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"

type StarNode = {
  id: string
  position: [number, number, number]
  size: number
  featured?: boolean
  color?: string
}

function clamp01(v: number) {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

function impulse(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export default function Starfield(props: {
  visible: boolean
  stars?: Array<{
    id: string
    position: [number, number, number]
    size?: number
    color?: string
  }>
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
  const generatedStars = useMemo<StarNode[]>(() => {
    uraiNow()
    uraiTime()
    const nodes: StarNode[] = []
    for (let i = 0; i < 85; i += 1) {
      const x = (uraiRandom() - 0.5) * 12.4
      const y = (uraiRandom() - 0.5) * 7.8
      const z = -1.8 - uraiRandom() * 11.8
      const size = 0.02 + uraiRandom() * 0.14
      nodes.push({
        id: "field-star-" + i,
        position: [x, y, z],
        size,
        featured: false,
        color: "#8ea3c7",
      })
    }
    return nodes
  }, [])

  const featuredStars: StarNode[] = (props.stars ?? []).map((star) => ({
    id: star.id,
    position: star.position,
    size: star.size ?? 0.13,
    featured: true,
    color: star.color ?? "#9fd3ff",
  }))

  const allStars: StarNode[] = [...generatedStars, ...featuredStars]

  const opacity = props.opacity ?? 1
  const worldScale = props.worldScale ?? 1
  const yOffset = props.yOffset ?? 0
  const zOffset = props.zOffset ?? 0
  const interactive = props.interactive ?? true
  const collapseToSelected = props.collapseToSelected ?? false
  const focusSuppression = clamp01(props.focusSuppression ?? 0)

  const selectedStar = allStars.find((s) => s.id === props.selectedStarId) ?? null

  const seenIds = new Set<string>()
  for (const s of allStars) {
    if (seenIds.has(s.id)) {
      console.warn("[Starfield] duplicate star id", s.id)
    }
    seenIds.add(s.id)
  }

  const collapseRef = useRef(0)

  useFrame((_, delta) => {
      const time = performance.now() * 0.001
    const target = collapseToSelected && props.selectedStarId ? 1 : 0
    const speed = target > collapseRef.current ? 8 : 5
    collapseRef.current += (target - collapseRef.current) * Math.min(delta * speed, 1)
  })

  return (
    <group
      visible={props.visible}
      position={[0, yOffset, zOffset]}
      scale={[worldScale, worldScale, worldScale]}
    >
      {allStars.map((star, index) => {
        const selected = props.selectedStarId === star.id
        const hasSelection = collapseToSelected && !!props.selectedStarId
        const t = clamp01(collapseRef.current)
        const g = impulse(t)

          let position: [number, number, number] = star.position
        if (
          !Array.isArray(star.position) ||
          star.position.length !== 3 ||
          !star.position.every((v) => Number.isFinite(v))
        ) {
          throw new Error(
          );
        }

          // === SAFE PARALLAX DEPTH LAYERS ===
          const driftT = performance.now() * 0.001
          const depth = Math.abs(star.position[2])
          const layer = depth < 6 ? 1.0 : depth < 10 ? 0.58 : 0.24
          const nearPass = depth < 6 ? 1 : 0
          const driftX = Math.cos(driftT * (0.34 + layer * 0.22) + index * 0.17) * (0.035 + nearPass * 0.060) * layer
          const driftY = Math.sin(driftT * (0.46 + layer * 0.28) + index * 0.13) * (0.055 + nearPass * 0.075) * layer
          const driftZ = nearPass ? Math.sin(driftT * 1.2 + index * 0.31) * 1.6 - 0.6 : 0

          position = [
            star.position[0] + driftX,
            star.position[1] + driftY + 3.2,
            star.position[2] + driftZ,
          ]
        if (selectedStar && hasSelection) {
          if (
            !Array.isArray(selectedStar.position) ||
            selectedStar.position.length !== 3 ||
            !selectedStar.position.every((v) => Number.isFinite(v))
          ) {
            throw new Error(
            );
          }
          const dx = star.position[0] - selectedStar.position[0]
          const dy = star.position[1] - selectedStar.position[1]
          const dz = star.position[2] - selectedStar.position[2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.0001
          const gravity = 1 / (1 + dist * 0.35)
          const curve = 1 - 0.58 * g * gravity
          const push = selected ? 0 : (3.2 + dist * 0.35) * g

          position = [
            selectedStar.position[0] + dx * curve,
            selectedStar.position[1] + dy * curve,
            selectedStar.position[2] + dz * curve - push,
          ]
        }

        const renderedSize = selected
          ? star.size * 3.0
          : star.featured
            ? star.size * 1.8 * (1 - focusSuppression * 0.10)
            : star.size * 1.25 * (1 - focusSuppression * 0.22)

        const renderedOpacity = selected
          ? 1 * opacity
          : star.featured
            ? (1.00 * (1 - focusSuppression * 0.78)) * opacity
            : (0.82 * (1 - focusSuppression * 0.74)) * opacity

        return (
          <mesh
            position={position}
            onPointerDown={(e) => {
              if (!interactive) return
              e.stopPropagation()
              props.onStarClick(star.id, star.position)
            }}
          >
            <sphereGeometry args={[renderedSize, 20, 20]} />
            <meshStandardMaterial
              color={selected ? "#ffe27a" : (star.color ?? "#8ea3c7")}
              transparent
              opacity={renderedOpacity}
            />
          </mesh>
        )
      })}
    </group>
  )
}
