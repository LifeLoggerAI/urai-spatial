"use client"

import { useMemo, useState } from "react"
import * as THREE from "three"

export default function Starfield() {

  const [selectedStarId, setSelectedStarId] = useState<number | null>(null)

  const stars = useMemo(() => {

    const list: { id: number; position: [number, number, number] }[] = []
    const radius = 80
    const total = 160

    for (let i = 0; i < total; i++) {

      const theta = (i / total) * Math.PI * 2
      const phi = (i * 1.618) % Math.PI

      const x = radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(phi)

      list.push({
        id: i,
        position: [x, y, z]
      })
    }

    return list

  }, [])

  return (
    <>
      {stars.map((star) => {

        const selected = selectedStarId === star.id
        const dim = selectedStarId !== null && !selected

        return (
          <mesh
            key={star.id}
            position={star.position}
            onClick={() => setSelectedStarId(star.id)}
          >
            <sphereGeometry args={[selected ? 0.7 : 0.35, 16, 16]} />
            <meshStandardMaterial
              color={selected ? "#ffd166" : "#ffffff"}
              emissive={selected ? "#ffaa00" : "#111111"}
              emissiveIntensity={selected ? 3 : dim ? 0.1 : 0.6}
            />
          </mesh>
        )
      })}
    </>
  )
}