"use client"

import React, { useMemo } from "react"
import { Html, Line } from "@react-three/drei"

type Vec3 = [number, number, number]

export type LifeMapStar = {
  id: string
  position: Vec3
  color?: string
  size?: number
  title?: string
  importance?: number
}

type Props = {
  visible?: boolean
  interactive?: boolean
  stars?: LifeMapStar[]
  selectedStarId?: string | null
  onSelectStar?: (id: string) => void
  opacity?: number
}

const DEFAULT_COLOR = "#9fd3ff"

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function bandForDepth(zAbs: number) {
  if (zAbs < 16) return "near"
  if (zAbs < 28) return "midNear"
  if (zAbs < 44) return "midFar"
  return "far"
}

function makeConstellationPairs(stars: LifeMapStar[]) {
  const points = stars.filter((s) => !s.id.startsWith("field_"))
  const pairs: Array<[LifeMapStar, LifeMapStar]> = []
  const used = new Set<string>()

  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const candidates = points
      .filter((b) => b.id !== a.id)
      .map((b) => {
        const dx = a.position[0] - b.position[0]
        const dy = a.position[1] - b.position[1]
        const dz = a.position[2] - b.position[2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        return { b, d }
      })
      .filter(({ d }) => d > 1.8 && d < 7.2)
      .sort((x, y) => x.d - y.d)
      .slice(0, 1)

    for (const { b } of candidates) {
      const key = [a.id, b.id].sort().join("::")
      if (used.has(key)) continue
      used.add(key)
      pairs.push([a, b])
    }
  }

  return pairs.slice(0, 10)
}

function expandStars(sourceStars: LifeMapStar[]) {
  const out: LifeMapStar[] = [...sourceStars]

  for (const s of sourceStars) {
    const seed = hashString(s.id)
    const importance = s.importance ?? 0.75

    const satellites = [
      { dx: -1.8 - seed * 1.1, dy: 0.5 + seed * 1.1, dz: -9 - seed * 10.0, scale: 0.48 },
      { dx:  1.5 + seed * 1.5, dy: -0.5 - seed * 0.9, dz: -19 - seed * 10.5, scale: 0.34 },
      { dx: -3.4 - seed * 1.9, dy: 1.7 + seed * 1.0, dz: -31 - seed * 13.0, scale: 0.25 },
      { dx:  5.4 + seed * 3.8, dy: 2.3 + seed * 1.8, dz: -48 - seed * 22.0, scale: 0.17 },
    ]

    satellites.forEach((m, idx) => {
      out.push({
        id: `field_${s.id}_${idx}`,
        title: "",
        color: s.color ?? DEFAULT_COLOR,
        importance: importance * m.scale,
        size: Math.max(0.035, (s.size ?? 0.18) * m.scale),
        position: [
          s.position[0] + m.dx,
          s.position[1] + m.dy,
          s.position[2] + m.dz,
        ],
      })
    })
  }

  return out
}

export default function LifeMapStarfield({
  visible = true,
  interactive = true,
  stars = [],
  selectedStarId = null,
  onSelectStar,
  opacity = 1,
}: Props) {
  const resolvedStars = useMemo(() => expandStars(stars), [stars])
  const constellationPairs = useMemo(() => makeConstellationPairs(stars), [stars])

  useMemo(() => {
    if (typeof window !== "undefined") {
      ;(window as any).__URAI_STARS__ = stars
    }
    return undefined
  }, [stars])

  if (!visible) return null

  const globalOpacity = clamp01(opacity)

  return (
    <group>
      {constellationPairs.map(([a, b], idx) => {
        const zAvg = (Math.abs(a.position[2]) + Math.abs(b.position[2])) / 2
        const farFade = 1 - smoothstep(12, 54, zAvg)
        const lineOpacity = Math.max(0.025, 0.11 * farFade) * globalOpacity
        return (
          <Line
            key={`constellation-${idx}`}
            points={[a.position, b.position]}
            color="#8fb7ff"
            transparent
            opacity={lineOpacity}
            lineWidth={0.5}
            depthWrite={false}
          />
        )
      })}

      {resolvedStars.map((star) => {
        const isSelected = selectedStarId === star.id
        const zAbs = Math.abs(star.position[2])
        const band = bandForDepth(zAbs)
        const baseSize = star.size ?? 0.14
        const importance = star.importance ?? 0.65

        const nearness = 1 - smoothstep(10, 66, zAbs)
        const attenuation = 1 - smoothstep(12, 62, zAbs)

        const bandScale =
          band === "near" ? 1.10 :
          band === "midNear" ? 0.80 :
          band === "midFar" ? 0.58 : 0.40

        const bandOpacity =
          band === "near" ? 0.92 :
          band === "midNear" ? 0.58 :
          band === "midFar" ? 0.34 : 0.18

        const selectedScale = isSelected ? 1.55 : 1
        const selectedOpacity = isSelected ? 1.22 : 1

        const finalScale = Math.max(0.028, baseSize * bandScale * (0.78 + importance * 0.40) * selectedScale)
        const finalOpacity = clamp01(bandOpacity * (0.46 + attenuation * 0.62) * selectedOpacity) * globalOpacity
        const haloScale = 1.9 + nearness * 0.9
        const haloOpacity = clamp01(finalOpacity * (isSelected ? 0.18 : 0.08) * (0.42 + nearness * 0.42))

        return (
          <group key={star.id} position={star.position}>
            <mesh
              onClick={() => {
                if (interactive && onSelectStar && !star.id.startsWith("field_")) onSelectStar(star.id)
              }}
            >
              <sphereGeometry args={[finalScale, 14, 14]} />
              <meshBasicMaterial
                color={star.color ?? DEFAULT_COLOR}
                transparent
                opacity={finalOpacity}
                depthWrite={false}
              />
            </mesh>

            <mesh>
              <sphereGeometry args={[finalScale * haloScale, 16, 16]} />
              <meshBasicMaterial
                color={star.color ?? DEFAULT_COLOR}
                transparent
                opacity={haloOpacity}
                depthWrite={false}
              />
            </mesh>

            {!!star.title && !star.id.startsWith("field_") && isSelected && (
              <Html center distanceFactor={18}>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(5,10,20,0.72)",
                    border: "1px solid rgba(170,200,255,0.22)",
                    color: "#eaf2ff",
                    fontSize: 12,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    opacity: 0.96,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
                  }}
                >
                  {star.title}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}
