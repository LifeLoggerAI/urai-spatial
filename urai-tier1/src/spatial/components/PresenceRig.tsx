"use client"

import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const HOME_HUMAN_MODEL = '/assets/urai/generated/human-rig-v3/home-human-rigged-v3.glb'

export default function PresenceRig() {
  const model = useGLTF(HOME_HUMAN_MODEL)
  const root = useRef<THREE.Group>(null)
  const { actions } = useAnimations(model.animations, root)

  useEffect(() => {
    const idle = actions.idle_breath
    idle?.reset().fadeIn(0.3).play()
    return () => {
      idle?.fadeOut(0.2)
    }
  }, [actions])

  useEffect(() => {
    model.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = true
    })
  }, [model.scene])

  return (
    <group
      ref={root}
      position={[2.1, 0, -1.2]}
      rotation={[0, -0.16, 0]}
      userData={{ representation: 'skinned-animated-home-human-v3', modelUrl: HOME_HUMAN_MODEL, lighting: 'canonical-home-physical' }}
    >
      <primitive object={model.scene} />
    </group>
  )
}

useGLTF.preload(HOME_HUMAN_MODEL)
