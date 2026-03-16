'use client'

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useRef } from "react"

import { useSpatialStore } from "../state/spatialStore"
import { demoData } from "../data/demoData"

export default function MemoryDive() {

  const { camera } = useThree()

  const selectedStarId = useSpatialStore((s) => s.selectedStarId)
  const interactionLock = useSpatialStore((s) => s.interactionLock)
  const setInteractionLock = useSpatialStore((s) => s.setInteractionLock)

  const target = useRef(new THREE.Vector3())
  const desiredPosition = useRef(new THREE.Vector3())
  const velocity = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())

  const diff = useRef(new THREE.Vector3())
  const currentLook = useRef(new THREE.Vector3())
  const desiredLook = useRef(new THREE.Vector3())
  const lookPoint = useRef(new THREE.Vector3())

  const offset = useRef(new THREE.Vector3(0, 0, 2.5))

  const MOVE_STRENGTH = 5.0
  const LOOK_STRENGTH = 6.0

  useFrame((_, delta) => {

    const dt = Math.min(delta, 0.05)

    if (!selectedStarId) return
    if (!interactionLock) return

    const star = demoData.find((s) => s.id === selectedStarId)
    if (!star) return

    target.current.set(
      star.position[0],
      star.position[1],
      star.position[2]
    )

    desiredPosition.current
      .copy(target.current)
      .add(offset.current)

    diff.current
      .copy(desiredPosition.current)
      .sub(camera.position)

    velocity.current.addScaledVector(
      diff.current,
      MOVE_STRENGTH * dt
    )

    velocity.current.multiplyScalar(0.85)

    camera.position.addScaledVector(
      velocity.current,
      dt * 60
    )

    lookTarget.current.copy(target.current)

    camera.getWorldDirection(currentLook.current)

    desiredLook.current
      .copy(lookTarget.current)
      .sub(camera.position)
      .normalize()

    currentLook.current.lerp(
      desiredLook.current,
      LOOK_STRENGTH * dt
    )

    lookPoint.current
      .copy(camera.position)
      .add(currentLook.current)

    camera.lookAt(lookPoint.current)

    const distance = camera.position.distanceTo(desiredPosition.current)

    if (distance < 0.08) {

      camera.position.copy(desiredPosition.current)
      camera.lookAt(target.current)

      velocity.current.set(0,0,0)

      setInteractionLock(false)

    }

  })

  return null
}