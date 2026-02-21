'use client'

import { useRouter } from 'next/navigation'

export default function Ground() {
  const router = useRouter()

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -3.5, -2]}
      onClick={(e) => {
        e.stopPropagation()
        router.push('/ground')
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color="#001122" transparent opacity={0.6} />
    </mesh>
  )
}
