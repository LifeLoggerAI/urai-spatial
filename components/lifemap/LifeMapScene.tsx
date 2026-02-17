"use client"

import { useMemo } from "react"

export default function LifeMapScene() {
  const stars = useMemo(() => {
    const arr = []
    for (let i = 0; i < 2000; i++) {
      arr.push([
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400,
        -Math.random() * 800,
      ])
    }
    return arr
  }, [])

  return (
    <>
      {stars.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}
    </>
  )
}
