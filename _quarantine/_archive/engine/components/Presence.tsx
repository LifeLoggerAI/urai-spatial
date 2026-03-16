"use client"

import { useMemo } from "react"
import { usePresenceStore } from "../state/usePresenceStore"
import Avatar from "./Avatar"

export default function Presence() {

  const others = usePresenceStore((s) => s.others)

  const users = useMemo(() => {
    return others ?? []
  }, [others])

  if (users.length === 0) return null

  return (
    <>
      {users.map((user) => (
        <Avatar
          key={user.id}
          position={user.position}
          rotation={user.rotation}
        />
      ))}
    </>
  )

}