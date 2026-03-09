"use client"

import { useSpatialStore } from "../store/spatialStore"

export default function Star({ position }) {

  const target = useSpatialStore((s) => s.target)
  const selectStar = useSpatialStore((s) => s.selectStar)

  const isSelected =
    target &&
    target[0] === position[0] &&
    target[1] === position[1] &&
    target[2] === position[2]

  return (
    <mesh
      position={position}
      onClick={() => selectStar(position)}
    >
      <sphereGeometry args={[isSelected ? 0.22 : 0.15, 16, 16]} />
      <meshBasicMaterial
        color="white"
        opacity={isSelected ? 1 : 0.25}
        transparent
      />
    </mesh>
  )
}
