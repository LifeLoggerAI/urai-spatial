'use client'

import { useStarStore } from '../state/star-store'
import Star from '@/components/Star'

export default function SceneRouter() {
  const stars = useStarStore((s) => s.stars)

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={2} />

      {stars.map((star) => (
        <Star key={star.id} star={star} />
      ))}
    </>
  )
}
