"use client"

import { useMemo, useState } from "react"

export default function Starfield({ setTarget }) {

  const [selected, setSelected] = useState<number | null>(null)

  const stars = useMemo(() => {

    const list = []
    const radius = 10

    for (let i = 0; i < 140; i++) {

      const theta = (i / 140) * Math.PI * 2
      const phi = (i * 1.618) % Math.PI

      const x = radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      const z = radius * Math.cos(phi)

      list.push({
        id: i,
        position: [x, y, z],
        size: 0.02 + (i % 5) * 0.004
      })
    }

    return list

  }, [])

  return (
    <>
      {stars.map((star) => {

        const isSelected = selected === star.id
        const dim = selected !== null && !isSelected

        return (
          <mesh
            key={star.id}
            position={star.position}
            scale={isSelected ? 2.2 : 1}
            onClick={() => {
              setSelected(star.id)
              if (setTarget) setTarget(star.position)
            }}
          >
            <sphereGeometry args={[star.size, 10, 10]} />
            <meshBasicMaterial
              color={isSelected ? "#ffffff" : "#cccccc"}
              transparent
              opacity={dim ? 0.15 : 1}
            />
          </mesh>
        )

      })}
    </>
  )
}