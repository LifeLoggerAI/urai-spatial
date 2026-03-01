'use client'

import { useSceneStore } from '../state/useSceneStore'
import Sky from '../components/Sky'
import Ground from '../components/Ground'
import Avatar from '../components/Avatar'
import Orb from '../components/Orb'

export default function Home() {
  const startTransition = useSceneStore((s) => s.startTransition)

  return (
    <>
      <Sky />

      {/* SKY CLICK PLANE ONLY */}
      <mesh
        position={[0, 30, -40]}
        onClick={(e) => {
          e.stopPropagation()
          startTransition()
        }}
      >
        <planeGeometry args={[400, 200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Ground />
      <Avatar />
      <Orb />
    </>
  )
}
