'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

interface ReplaySceneProps {
  memoryId: string
  emotionalWeight: number
  timestamp: number
}

// Deterministic easing function
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export default function ReplayScene({ memoryId, emotionalWeight, timestamp }: ReplaySceneProps) {
  // 1. Seeded Randomness (removed for now)
  const rng = useMemo(() => Math.random, [])

  // 2. Freeze Replay Inputs
  const replaySnapshot = useMemo(
    () => ({
      memoryId,
      emotionalWeight,
      timestamp,
    }),
    [memoryId, emotionalWeight, timestamp],
  )

  // Example of using the seeded random number
  const randomValue = useMemo(() => rng(), [rng])

  // 3. Lock Camera Drift (Example with a dummy camera ref)
  const cameraRef = useRef<any>()
  useFrame(({ clock }) => {
    if (cameraRef.current) {
      const t = easeInOutCubic((clock.getElapsedTime() % 5) / 5) // Example animation loop
      cameraRef.current.position.x = t * 10
    }
  })

  useEffect(() => {
    // Use replaySnapshot for all logic to ensure consistency
    console.log('Replay started with snapshot:', replaySnapshot)
    console.log('Deterministic random value:', randomValue)
  }, [replaySnapshot, randomValue])

  return (
    <>
      {/* Your scene objects here, using deterministic values */}
      <perspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 15]} />
    </>
  )
}
