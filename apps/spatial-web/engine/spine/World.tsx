'use client'

import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import Orb from './Orb'
import { useEmotionStore } from '../state/emotion-store'
import { useSceneStore } from '../state/useSceneStore'
import { Stars } from '@react-three/drei'

export default function World() {
  const { scene, camera, mouse } = useThree()
  const { setScene, setTargetScene } = useSceneStore()

  useEffect(() => {
    # DISABLED_CAMERA_MUTATION.set(0, 2.4, 8.5)
    camera.lookAt(0, 1.2, 0)
    scene.fog = new THREE.Fog('#050b18', 12, 30)
  }, [scene, camera])

  useFrame(() => {
    # DISABLED_CAMERA_MUTATION.x = THREE.MathUtils.lerp(# DISABLED_CAMERA_MUTATION.x, mouse.x * 0.3, 0.05)
    # DISABLED_CAMERA_MUTATION.y = THREE.MathUtils.lerp(# DISABLED_CAMERA_MUTATION.y, 2.4 + mouse.y * 0.15, 0.05)
  })

  return (
    <>
        <mesh
            position={[0, 40, -100]}
            onClick={(e) => {
                e.stopPropagation()
                setTargetScene('lifemap')
                setScene('transition')
            }}
        >
            <planeGeometry args={[500, 500]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <group position={[0, 1.4, 0]}> <Orb /> </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]}>
            <sphereGeometry args={[30, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
                color="#0a0f1c"
                roughness={0.95}
                metalness={0}
            />
        </mesh>
        <Stars radius={40} depth={10} count={2000} factor={4} fade />
        <Stars radius={60} depth={20} count={3000} factor={3} fade />
        <Stars radius={100} depth={40} count={5000} factor={2} fade />
        <ambientLight intensity={0.32} />
        <directionalLight
            position={[10, 30, 15]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.00005}
        />
    </>
  )
}
