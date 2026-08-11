'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { stepEmbodiedMotion, type MovementInput } from './EmbodiedNavigation'

type RealmBounds = { minX: number; maxX: number; minZ: number; maxZ: number }
type RealmObstacle = { x: number; z: number; radius: number }

type EmbodiedRealmCameraProps = {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  reducedMotion: boolean
  ownerRef: { current: HTMLElement | null }
  datasetPrefix: string
  spawn: [number, number]
  cameraHeight?: number
  speed?: number
  bounds: RealmBounds
  obstacles?: RealmObstacle[]
}

export function EmbodiedRealmCamera({
  input,
  yaw,
  pitch,
  reducedMotion,
  ownerRef,
  datasetPrefix,
  spawn,
  cameraHeight = 1.68,
  speed = 2.1,
  bounds,
  obstacles = [],
}: EmbodiedRealmCameraProps) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(spawn[0], 0, spawn[1]))
  const velocity = useRef(new THREE.Vector3())
  const target = useRef<THREE.Vector3 | null>(null)
  const direction = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? speed * 0.72 : speed,
      acceleration: 8.2,
      deceleration: 10,
      bounds,
      obstacles,
      arrivalRadius: 0.3,
    })

    camera.position.set(position.current.x, cameraHeight, position.current.z)
    direction.current.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    camera.lookAt(direction.current.add(camera.position))

    const owner = ownerRef.current
    if (owner) {
      owner.dataset[`${datasetPrefix}CameraX`] = camera.position.x.toFixed(3)
      owner.dataset[`${datasetPrefix}CameraZ`] = camera.position.z.toFixed(3)
      owner.dataset[`${datasetPrefix}Moving`] = motion.moving ? 'true' : 'false'
      owner.dataset[`${datasetPrefix}EmbodiedReady`] = 'true'
    }
  })

  return null
}
