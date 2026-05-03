"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"

export type LifeMapStar = {
  id: string
  x: number
  y: number
  z: number
  r: number
  color: string
  tone: string
  soft: number
  sort: number
  major?: boolean
  title?: string
  date?: string
  narrator?: string
}

type InputStar = {
  id: string
  position: [number, number, number]
  size?: number
  color?: string
  title?: string
  tone?: string
}

type StarNode = LifeMapStar & {
  position: [number, number, number]
}

type StarfieldProps = {
  visible: boolean
  stars?: InputStar[]
  lifeMapStars?: LifeMapStar[]
  selectedStarId: string | null
  onStarClick: (id: string, position: [number, number, number]) => void
  interactive?: boolean
  opacity?: number
  worldScale?: number
  yOffset?: number
  zOffset?: number
  collapseToSelected?: boolean
  focusSuppression?: number
}

const TONE_COLORS: Record<string, string> = {
  focus: "#9fd3ff",
  grief: "#c6a7ff",
  joy: "#ffd18e",
  tense: "#ff9fb8",
  tension: "#ff9fb8",
  neutral: "#d9e8ff",
  awe: "#7ce2ff",
  recovery: "#9cffc7",
  calm: "#a7c7ff",
}

function isFinitePosition(position: unknown): position is [number, number, number] {
  return (
    Array.isArray(position) &&
    position.length === 3 &&
    position.every((value) => typeof value === "number" && Number.isFinite(value))
  )
}

function normalizeLifeMapStar(star: LifeMapStar): StarNode | null {
  const position: [number, number, number] = [star.x, star.y, star.z]

  if (!isFinitePosition(position) || !Number.isFinite(star.r)) {
    return null
  }

  return {
    ...star,
    r: Math.max(0.035, star.r),
    color: star.color || TONE_COLORS[star.tone] || "#9fd3ff",
    soft: Number.isFinite(star.soft) ? star.soft : 0.75,
    sort: Number.isFinite(star.sort) ? star.sort : 0,
    position,
  }
}

function mapInputStarToLifeMapStar(star: InputStar, index: number): StarNode | null {
  if (!isFinitePosition(star.position)) return null

  const tone = star.tone ?? "focus"
  const x = star.position[0] * 3.4
  const y = star.position[1] + 16 + (index % 3) * 1.6
  const z = -138 - index * 13 + star.position[2] * 3

  const position: [number, number, number] = [x, y, z]

  return {
    id: star.id,
    x,
    y,
    z,
    r: Math.max(0.55, (star.size ?? 0.16) * 5.5),
    color: star.color ?? TONE_COLORS[tone] ?? "#9fd3ff",
    tone,
    soft: 0.95,
    sort: index,
    major: true,
    title: star.title ?? `Memory ${index + 1}`,
    position,
  }
}

function createFallbackMajorStars(): StarNode[] {
  const tones = ["focus", "grief", "joy", "tense", "neutral", "awe", "recovery", "calm", "focus", "joy"]

  return Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2
    const radius = 14 + (index % 3) * 4.5
    const x = Math.cos(angle) * radius
    const y = 15 + Math.sin(angle * 1.45) * 7
    const z = -132 - index * 14
    const tone = tones[index] ?? "neutral"

    return {
      id: `major-${index}`,
      x,
      y,
      z,
      r: 0.78 + (index % 4) * 0.08,
      color: TONE_COLORS[tone] ?? "#9fd3ff",
      tone,
      soft: 0.95,
      sort: index,
      major: true,
      title:
        [
          "First Signal",
          "Grief Thread",
          "Bright Return",
          "Tension Gate",
          "Quiet Pattern",
          "Awe Window",
          "Recovery Bloom",
          "Calm Anchor",
          "Focus Echo",
          "Joy Orbit",
        ][index] ?? `Memory ${index + 1}`,
      date: `Era ${index + 1}`,
      narrator: "A point in the wider pattern is awake.",
      position: [x, y, z],
    }
  })
}

function createBackgroundStars(count = 70): StarNode[] {
  return Array.from({ length: count }, (_, index) => {
    const x = ((index * 37) % 97) - 48
    const y = 3 + ((index * 23) % 42)
    const z = -96 - ((index * 41) % 230)
    const r = 0.055 + ((index * 13) % 9) * 0.009

    return {
      id: `bg-${index}`,
      x,
      y,
      z,
      r,
      color: index % 7 === 0 ? "#b7c9ff" : "#7f96bd",
      tone: "neutral",
      soft: 0.65,
      sort: index + 1000,
      major: false,
      position: [x, y, z],
    }
  })
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export default function Starfield({
  visible,
  stars,
  lifeMapStars,
  selectedStarId,
  onStarClick,
  interactive = true,
  opacity = 1,
  worldScale = 1,
  yOffset = 0,
  zOffset = 0,
  collapseToSelected = false,
  focusSuppression = 0,
}: StarfieldProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const timeRef = useRef(0)
  const collapseRef = useRef(0)
  const warnedInvalidRef = useRef(false)

  const fallbackMajorStars = useMemo(() => createFallbackMajorStars(), [])
  const fallbackBackgroundStars = useMemo(() => createBackgroundStars(70), [])

  const { allStars, majorStars } = useMemo(() => {
    const normalizedLifeMapStars = (lifeMapStars ?? [])
      .map(normalizeLifeMapStar)
      .filter((star): star is StarNode => Boolean(star))

    const mappedInputStars = (stars ?? [])
      .map(mapInputStarToLifeMapStar)
      .filter((star): star is StarNode => Boolean(star))

    const invalidCount = (lifeMapStars?.length ?? 0) + (stars?.length ?? 0) - normalizedLifeMapStars.length - mappedInputStars.length

    if (invalidCount > 0 && process.env.NODE_ENV !== "production" && !warnedInvalidRef.current) {
      warnedInvalidRef.current = true
      console.warn(`[Starfield] Dropped ${invalidCount} invalid star record(s).`)
    }

    const suppliedMajorStars = normalizedLifeMapStars
      .filter((star) => star.major)
      .sort((a, b) => a.sort - b.sort)

    const suppliedBackgroundStars = normalizedLifeMapStars
      .filter((star) => !star.major)
      .sort((a, b) => a.sort - b.sort)

    const majors =
      suppliedMajorStars.length > 0
        ? suppliedMajorStars
        : mappedInputStars.length > 0
          ? mappedInputStars
          : fallbackMajorStars

    const background = suppliedBackgroundStars.length >= 30 ? suppliedBackgroundStars : fallbackBackgroundStars

    const seen = new Set<string>()
    const deduped = [...background, ...majors].filter((star) => {
      if (seen.has(star.id)) return false
      seen.add(star.id)
      return true
    })

    return {
      allStars: deduped,
      majorStars: majors,
    }
  }, [fallbackBackgroundStars, fallbackMajorStars, lifeMapStars, stars])

  const constellationLinks = useMemo(
    () =>
      majorStars
        .slice()
        .sort((a, b) => a.sort - b.sort)
        .slice(1)
        .map((star, index) => [majorStars[index], star] as const)
        .filter(([a, b]) => Boolean(a && b)),
    [majorStars],
  )

  useFrame((_, delta) => {
    timeRef.current += Math.min(delta, 0.05)

    const target = collapseToSelected && selectedStarId ? 1 : 0
    const speed = target > collapseRef.current ? 3.8 : 4.6
    collapseRef.current += (target - collapseRef.current) * Math.min(delta * speed, 1)
  })

  if (!visible) return null

  const selectedStar = allStars.find((star) => star.id === selectedStarId) ?? null
  const focusDim = clamp01(focusSuppression)
  const baseOpacity = clamp01(opacity)

  return (
    <group position={[0, yOffset, zOffset]} scale={worldScale}>
      {constellationLinks.map(([from, to], index) => {
        const positions = new Float32Array([...from.position, ...to.position])

        return (
          <line key={`constellation-${from.id}-${to.id}-${index}`} renderOrder={5}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial
              color="#7fa8e8"
              transparent
              opacity={0.22 * baseOpacity * (1 - focusDim * 0.45)}
              depthWrite={false}
              depthTest={true}
            />
          </line>
        )
      })}

      {allStars.map((star, index) => {
        const isMajor = Boolean(star.major)
        const isSelected = selectedStarId === star.id
        const isHovered = hoveredId === star.id
        const hasSelection = Boolean(selectedStar)

        const drift = timeRef.current
        const driftStrength = isMajor ? 0.18 : 0.32
        let position: [number, number, number] = [
          star.position[0] + Math.sin(drift * 0.16 + index * 0.71) * driftStrength,
          star.position[1] + Math.cos(drift * 0.2 + index * 0.43) * driftStrength * 0.7,
          star.position[2],
        ]

        if (collapseRef.current > 0.001 && selectedStar && !isSelected) {
          const t = collapseRef.current
          const pull = isMajor ? 0.18 : 0.08

          position = [
            position[0] + (selectedStar.position[0] - position[0]) * t * pull,
            position[1] + (selectedStar.position[1] - position[1]) * t * pull,
            position[2] + (selectedStar.position[2] - position[2]) * t * pull,
          ]
        }

        const dimForSelection = hasSelection && !isSelected ? 0.42 : 1
        const dimForFocus = isMajor ? 1 - focusDim * 0.16 : 1 - focusDim * 0.54
        const starOpacity = baseOpacity * dimForSelection * dimForFocus * (isMajor ? 0.94 : 0.5)
        const radius = star.r * (isSelected ? 1.9 : isHovered ? 1.35 : 1)

        return (
          <group key={star.id}>
            {isMajor && (
              <mesh position={position} renderOrder={10}>
                <sphereGeometry args={[radius * 2.7, 24, 24]} />
                <meshBasicMaterial
                  color={isSelected ? "#ffe27a" : star.color}
                  transparent
                  opacity={starOpacity * (isSelected ? 0.2 : isHovered ? 0.16 : 0.1)}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </mesh>
            )}

            <mesh
              position={position}
              renderOrder={isMajor ? 20 : 8}
              onPointerOver={(event) => {
                if (!isMajor) return
                event.stopPropagation()
                setHoveredId(star.id)
                if (typeof document !== "undefined") document.body.style.cursor = interactive ? "pointer" : "default"
              }}
              onPointerOut={(event) => {
                if (!isMajor) return
                event.stopPropagation()
                setHoveredId(null)
                if (typeof document !== "undefined") document.body.style.cursor = "default"
              }}
              onPointerDown={(event) => {
                if (!interactive || !isMajor) return
                event.stopPropagation()
                onStarClick(star.id, star.position)
              }}
            >
              <sphereGeometry args={[radius, isMajor ? 24 : 12, isMajor ? 24 : 12]} />
              <meshBasicMaterial
                color={isSelected ? "#ffe27a" : star.color}
                transparent
                opacity={Math.max(0.08, starOpacity)}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            {isMajor && (isHovered || isSelected) && (
              <group position={[position[0], position[1] + radius * 2.2 + 0.55, position[2]]} renderOrder={40}>
                <mesh>
                  <planeGeometry args={[3.6, 0.56]} />
                  <meshBasicMaterial
                    color={isSelected ? "#ffe9a8" : "#b9d7ff"}
                    transparent
                    opacity={0.58 * baseOpacity}
                    depthWrite={false}
                    depthTest={false}
                    toneMapped={false}
                  />
                </mesh>

                <mesh position={[0, -0.42, 0]}>
                  <planeGeometry args={[2.1, 0.08]} />
                  <meshBasicMaterial
                    color={star.color}
                    transparent
                    opacity={0.82 * baseOpacity}
                    depthWrite={false}
                    depthTest={false}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
}