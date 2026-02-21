'use client'

import { useRouter } from 'next/navigation'
import Starfield from '../lifemap/Starfield'
import { useLifeMapData } from '../../lib/lifemap/useLifeMapData'

export default function LifeMapScene() {
  const router = useRouter()
  const { memories, loading, error } = useLifeMapData()

  if (loading) return null
  if (error) return null

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {memories.length > 0 && <Starfield stars={memories} />}

      {/* Invisible plane for bottom navigation */}
      <mesh
        position={[0, -4, 0]} // Position it at the bottom of the viewport
        onClick={(e) => {
          e.stopPropagation() // Prevent clicks from going through to other objects
          router.push('/')
        }}
      >
        <planeGeometry args={[50, 4]} /> {/* Make it wide and tall enough */}
        <meshBasicMaterial visible={false} /> {/* Make it invisible */}
      </mesh>
    </>
  )
}
