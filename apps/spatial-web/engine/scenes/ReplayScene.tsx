'use client'

import { useReplayStore } from '@/engine/core/replay-store'
import { Sphere, Text } from '@react-three/drei'

export default function ReplayScene() {
  const { memoryId, emotionalWeight, timestamp } = useReplayStore()

  // Ensure there's a memoryId before rendering, otherwise, it's a "not found" state.
  if (!memoryId) {
    return null
  }

  // Calculate a visual property based on emotional weight
  const sphereColor = emotionalWeight > 0.5 ? 'hotpink' : 'lightblue'

  // Format the timestamp for display
  const date = new Date(timestamp)
  const formattedTime = date.toLocaleTimeString()

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      <Sphere args={[1, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color={sphereColor} />
      </Sphere>

      <Text position={[0, 1.5, 0]} fontSize={0.2} color="white">
        Memory ID: {memoryId}
      </Text>
      <Text position={[0, -1.5, 0]} fontSize={0.2} color="white">
        Time: {formattedTime}
      </Text>
    </>
  )
}
