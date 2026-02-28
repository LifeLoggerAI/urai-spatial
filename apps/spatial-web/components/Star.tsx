'use client'

import { memo } from 'react'
import { useThree } from '@react-three/fiber'
import { useReplayStore } from '@/engine/state/useReplayStore'
import { Star as StarType } from '@/engine/types'

const Star = memo(({ star }: { star: StarType }) => {
  const { camera } = useThree()
  const setActiveStarId = useReplayStore((s) => s.setActiveStarId)

  const handleClick = () => {
    setActiveStarId(star.id)
  }

  return (
    <mesh position={star.position} onClick={handleClick}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
  )
})

Star.displayName = 'Star'

export default Star
