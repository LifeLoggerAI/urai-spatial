import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
"use client"

import { useMemo } from "react"
import { useSceneStore } from "@/spatial/store/useSceneStore"

type StarNode = {
  id: string
  position: [number, number, number]
  size: number
}

export default function Starfield(props: {
  visible: boolean
  selectedStarId: string | null
  onStarClick: (id: string) => void
}) {
  const openFocus = useSceneStore((s) => s.openFocus)

  const stars = useMemo<StarNode[]>(() => {
    const out: StarNode[] = []

    const addBand = (
      count: number,
      zMin: number,
      zMax: number,
      spreadX: number,
      spreadY: number,
      sizeMin: number,
      sizeMax: number
    ) => {
      for (let i = 0; i < count; i++) {
        const z = zMin + uraiRandom() * (zMax - zMin)
        const x = (uraiRandom() - 0.5) * spreadX
        const y = (uraiRandom() - 0.5) * spreadY
        const size = sizeMin + uraiRandom() * (sizeMax - sizeMin)

        out.push({
          id: `star-${out.length}`,
          position: [x, y, z],
          size,
        })
      }
    }

    addBand(60, -18, -10, 26, 16, 0.03, 0.07)
    addBand(45, -9, -4, 16, 10, 0.05, 0.11)
    addBand(10, -3.5, -1.5, 8, 5, 0.14, 0.34)

    return out
  }, [])

  if (!props.visible) return null

  return (
    <group>
      {stars.map((star) => {
        const selected = props.selectedStarId === star.id
        const dim = props.selectedStarId && !selected

        return (
          <mesh
            key={star.id}
            position={star.position}
            onPointerDown={(e) => {
              e.stopPropagation()
              console.log("CLICK", star.id)
            }}
          >
            <sphereGeometry args={[star.size, 24, 24]} />
            <meshStandardMaterial
              color={selected || star.size > 0.13 ? "#d8c36b" : "#b4c4df"}
              transparent
              opacity={selected ? 1 : dim ? 0.15 : 0.9}
            />
          </mesh>
        )
      })}
    </group>
  )
}
