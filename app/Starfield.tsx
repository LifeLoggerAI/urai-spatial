"use client"

import { useMemo, useState } from "react"
import * as THREE from "three"

export default function Starfield() {

  const [selectedStarId, setSelectedStarId] = useState<number | null>(null)

  const stars = useMemo(() => {

    const list = []
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
        position: [x, y, z] as [number, number, number]
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
          <group
            key={star.id}
            position={star.position}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedStarId(star.id)
              console.log("Star selected:", star.id)
            }}
          >

            {/* invisible click collider */}
            <mesh>
              <sphereGeometry args={[1.2, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* visible star */}
            <mesh scale={selected ? 1.8 : 1}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial
                color={selected ? "#ffffff" : "#8fb5ff"}
                transparent
                opacity={dim ? 0.25 : 1}
              />
            </mesh>

          </group>
        )
      })}
    </>
  )
}
