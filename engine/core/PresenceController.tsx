'use client'

import { useFrame } from '@react-three/fiber'
import { usePresenceStore } from '../state/usePresenceStore'

// MOCK DATA FOR NOW
const MOCK_USERS = [
  {
    id: 'user-2',
    position: [2.4, -3.0, -1.2],
    rotation: [0, -0.5, 0],
  },
  {
    id: 'user-3',
    position: [-2.4, -3.0, -1.2],
    rotation: [0, 0.5, 0],
  },
]

export default function PresenceController() {
  const setOthers = usePresenceStore((s) => s.setOthers)

  // TODO: Replace with real-time Firestore connection
  useFrame(() => {
    setOthers(MOCK_USERS)
  })

  return null
}
