'use client'

import { useSceneStore } from '../state/useSceneStore'
import Sky from '../components/Sky'
import Ground from '../components/Ground'
import Avatar from '../components/Avatar'
import Orb from '../components/Orb'

export default function Home() {
  const setScene = useSceneStore((s) => s.setScene)

  return (
    <>
      <group
        onClick={(e) => {
          if (e.object.name === 'sky') {
            e.stopPropagation()
            setScene('lifemap')
          }
        }}
      >
        <Sky />
      </group>

      {/* SKY CLICK PLANE ONLY - NOW DISABLED */}
      <mesh position={[0, 30, -40]}>
        <planeGeometry args={[400, 200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Ground />
      <Avatar />
      <Orb />
    </>
  )
}
