'use client'

import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

type RealWorldModelProps = {
  src: string
  name?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

export default function RealWorldModel({
  src,
  name = 'urai-real-world-model',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: RealWorldModelProps) {
  const gltf = useGLTF(src)
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => material.clone())
      } else if (object.material) {
        object.material = object.material.clone()
      }
    })
    clone.name = name
    return clone
  }, [gltf.scene, name])

  return <primitive object={scene} position={position} rotation={rotation} scale={scale} />
}

export const REAL_WORLD_MODEL_PATHS = {
  councilChamber: '/assets/urai/generated/real-world-v1/council-chamber-real-v1.glb',
  councilGuide: '/assets/urai/generated/real-world-v1/council-guide-human-v1.glb',
  councilMirror: '/assets/urai/generated/real-world-v1/council-mirror-human-v1.glb',
  councilGuardian: '/assets/urai/generated/real-world-v1/council-guardian-human-v1.glb',
  councilArchivist: '/assets/urai/generated/real-world-v1/council-archivist-human-v1.glb',
  councilBuilder: '/assets/urai/generated/real-world-v1/council-builder-human-v1.glb',
  councilTrickster: '/assets/urai/generated/real-world-v1/council-trickster-human-v1.glb',
  shadow: '/assets/urai/generated/real-world-v1/shadow-hall-real-v1.glb',
  mirror: '/assets/urai/generated/real-world-v1/mirror-chamber-real-v1.glb',
  legacy: '/assets/urai/generated/real-world-v1/legacy-archive-real-v1.glb',
} as const

Object.values(REAL_WORLD_MODEL_PATHS).forEach((src) => useGLTF.preload(src))
