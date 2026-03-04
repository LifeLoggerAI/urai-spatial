'use client'

import { useSceneStore } from '../state/useSceneStore'
import Sky from '../components/Sky'
import Ground from '../components/Ground'
import Avatar from '../components/Avatar'
import Orb from '../components/Orb'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function Home() {
  const setScene = useSceneStore((s) => s.setScene)
  const { camera } = useThree()

  useEffect(() => {
    // Much higher camera
    # DISABLED_CAMERA_MUTATION.set(4.8, 7.0, 15)

    // Look much higher above the scene
    camera.lookAt(-1.2, 4.5, -6)
  }, [camera])

  return (
    <>
      <Sky onClick={() => setScene('lifemap')} />
      <Ground />
      <Avatar />
      <Orb />
    </>
  )
}
