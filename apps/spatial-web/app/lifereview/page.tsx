'use client'

import { Canvas } from '@react-three/fiber'
import LifeReviewScene from 'engine/scenes/LifeReviewScene'

export default function Page() {
  return (
    <div className="w-full h-screen">
      <Canvas>
        <LifeReviewScene />
      </Canvas>
    </div>
  )
}
