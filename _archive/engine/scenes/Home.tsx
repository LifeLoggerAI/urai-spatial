'use client'

import { useSceneStore } from '../state/useSceneStore'
import Sky from '../components/Sky'
import Ground from '../components/Ground'
import Avatar from '../components/Avatar'
import Orb from '../components/Orb'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

export default function Home() {

  const setScene = useSceneStore((s) => s.setScene)
  const { camera } = useThree()

  useEffect(() => {

    const target = new THREE.Vector3(-1.2, 4.5, -6)

    camera.position.set(4.8, 7.0, 15)
    camera.lookAt(target)
    camera.updateProjectionMatrix()

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