"use client"

import { Points, PointMaterial } from "@react-three/drei"
import { useMemo } from "react"

export default function SkyScene({ goBack }: { goBack: () => void }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(4000 * 3)
    for (let i = 0; i < 4000; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 200
      arr[i * 3 + 1] = (Math.random() - 0.5) * 200
      arr[i * 3 + 2] = (Math.random() - 0.5) * 200
    }
    return arr
  }, [])

  return (
    <>
      <Points positions={positions} stride={3}>
        <PointMaterial size={0.8} sizeAttenuation depthWrite={false} />
      </Points>

      <mesh position={[0, -20, 0]} onClick={goBack}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </>
  )
}
