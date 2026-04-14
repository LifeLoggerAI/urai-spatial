'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

export type LifeMapStar = {
  id: string
  position?: [number, number, number]
  color?: string
  size?: number
}

type Props = {
  visible?: boolean
  stars?: LifeMapStar[]
  selectedStarId?: string | null
  onSelectStar?: (id: string) => void
  onHoverStar?: (id: string | null) => void
  focusSuppression?: boolean
}

const FALLBACK_STAR_COUNT = 48
const FAR_RADIUS_MIN = 180
const FAR_RADIUS_MAX = 520
const DEPTH_MIN = -780
const DEPTH_MAX = -180

function hashIndex(i: number) {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function fallbackStars(): LifeMapStar[] {
  const out: LifeMapStar[] = []
  for (let i = 0; i < FALLBACK_STAR_COUNT; i++) {
    const a = hashIndex(i) * Math.PI * 2
    const r = FAR_RADIUS_MIN + hashIndex(i + 101) * (FAR_RADIUS_MAX - FAR_RADIUS_MIN)
    const x = Math.cos(a) * r * 0.55
    const y = -8 + hashIndex(i + 202) * 42
    const z = DEPTH_MIN + hashIndex(i + 303) * (DEPTH_MAX - DEPTH_MIN)
    const s = 0.9 + hashIndex(i + 404) * 2.4
    out.push({
      id: "generated-star-" + String(i + 1),
      position: [x, y, z],
      size: s,
      color: '#c9d6ff',
    })
  }
  return out
}

function dedupeStars(input?: LifeMapStar[]) {
  const seen = new Set<string>()
  const source = Array.isArray(input) && input.length > 0 ? input : fallbackStars()
  const out: LifeMapStar[] = []

  for (let i = 0; i < source.length; i++) {
    const raw = source[i]
    const baseId = String(raw?.id || "star-" + String(i + 1))
    let id = baseId
    let n = 2
    while (seen.has(id)) {
      id = baseId + "--" + String(n)
      n += 1
    }
    seen.add(id)

    const p = Array.isArray(raw?.position) && raw.position.length === 3
      ? raw.position
      : fallbackStars()[i % FALLBACK_STAR_COUNT].position!

    out.push({
      id,
      position: [p[0], p[1], p[2]],
      size: typeof raw?.size === 'number' ? raw.size : fallbackStars()[i % FALLBACK_STAR_COUNT].size,
      color: raw?.color || '#c9d6ff',
    })
  }

  return out
}

export default function LifeMapStarfield({
  visible = true,
  stars = [],
  selectedStarId = null,
  onSelectStar,
  onHoverStar,
  focusSuppression = false,
}: Props) {
  const stableStars = useMemo(() => dedupeStars(stars), [stars])

  if (!visible) return null

  return (
    <group visible={visible}>
      {stableStars.map((star) => {
        const pos = star.position || [0, 0, -240]
        const isSelected = selectedStarId === star.id
        const radius = isSelected ? (star.size || 1.2) * 1.35 : (star.size || 1.2)
        const opacity = focusSuppression && !isSelected ? 0.14 : isSelected ? 0.98 : 0.72

        return (
          <mesh
            key={star.id}
            position={new THREE.Vector3(pos[0], pos[1], pos[2])}
            onPointerOver={() => onHoverStar?.(star.id)}
            onPointerOut={() => onHoverStar?.(null)}
            onClick={() => onSelectStar?.(star.id)}
          >
            <sphereGeometry args={[radius, 24, 24]} />
            <meshBasicMaterial
              color={star.color || '#c9d6ff'}
              transparent
              opacity={opacity}
            />
          </mesh>
        )
      })}
    </group>
  )
}
