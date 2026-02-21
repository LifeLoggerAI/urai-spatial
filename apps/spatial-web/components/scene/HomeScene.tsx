'use client'

import { Suspense } from 'react'

import Stars from './Stars'
import Orb from './Orb'
import Ground from './Ground'
import ProceduralNebula from './ProceduralNebula'

export default function HomeScene() {
  return (
    <>
      <color attach="background" args={['black']} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      <Suspense fallback={null}>
        <Stars />
        <ProceduralNebula />
        <Ground />
        <Orb />
      </Suspense>
    </>
  )
}
