"use client"

import { useMemo } from "react"

export default function Starfield({ setTarget, target }) {

  const stars = useMemo(() => {

    const arr = []

    const cols = 5
    const rows = 4
    const spacingX = 3
    const spacingY = 2.5

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {

        arr.push([
          (x - cols/2) * spacingX,
          (y - rows/2) * spacingY,
          0
        ])

      }
    }

    return arr

  }, [])

  return (
    <>
      {stars.map((pos,i)=>{

        const isSelected =
          target &&
          pos[0] === target[0] &&
          pos[1] === target[1]

        if(isSelected) return null

        return (
          <mesh
            key={i}
            position={pos}
            onClick={() => setTarget(pos)}
          >
            <sphereGeometry args={[0.25,16,16]} />
            <meshBasicMaterial color="white" />
          </mesh>
        )

      })}
    </>
  )
}
