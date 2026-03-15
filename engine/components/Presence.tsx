'use client'

import { usePresenceStore } from '../state/usePresenceStore'
import Avatar from './Avatar'

export default function Presence() {
  const others = usePresenceStore((s) => s.others)

  return (
    <>
      {others.map((user) => (
        <Avatar key={user.id} position={user.position} rotation={user.rotation} />
      ))}
    </>
  )
}
