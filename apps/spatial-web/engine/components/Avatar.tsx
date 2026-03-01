'use client'

interface AvatarProps {
  position: [number, number, number]
  scale: [number, number, number]
}

export default function Avatar({ position, scale }: AvatarProps) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <capsuleGeometry args={[0.6, 2.2, 16, 32]} />
      <meshStandardMaterial color="#070c16" />
    </mesh>
  )
}
