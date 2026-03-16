'use client'

import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import Starfield from './Starfield'
import MemorySphere from '../../engine/spine/MemorySphere'
import useCameraGlide from '../../engine/spine/useCameraGlide'

const HOME_CAMERA_POS = new THREE.Vector3(0, 0, 10)
const HOME_CAMERA_TARGET = new THREE.Vector3(0, 0, 0)

function SceneCore() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.copy(HOME_CAMERA_POS)
    camera.lookAt(HOME_CAMERA_TARGET)
  }, [camera])

  useCameraGlide(camera)

  return (
    <>
      <Starfield />
      <MemorySphere />
    </>
  )
}

export default function HomeScene() {
  return <SceneCore />
}