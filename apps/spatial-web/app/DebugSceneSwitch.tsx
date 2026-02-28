'use client'

import { useIdentityStore } from '../engine/state/identity-store'

export default function DebugSceneSwitch() {
  const setScene = useIdentityStore((s) => s.setScene)

  return (
    <mesh position={[0, 1, 2]} onClick={() => setScene('lifemap')}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="red" />
    </mesh>
  )
}
