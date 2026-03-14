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

  const offset = new THREE.Vector3(0, 0, 2.5)

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

    desiredPosition.current.copy(target.current).add(offset)

    const diff = desiredPosition.current.clone().sub(camera.position)

    velocity.current.add(
      diff.multiplyScalar(MOVE_STRENGTH * dt)
    )

    velocity.current.multiplyScalar(0.85)

    camera.position.add(
      velocity.current.clone().multiplyScalar(dt * 60)
    )

    lookTarget.current.copy(target.current)

    const currentLook = new THREE.Vector3()
    camera.getWorldDirection(currentLook)

    const desiredLook = lookTarget.current.clone()
      .sub(camera.position)
      .normalize()

    currentLook.lerp(desiredLook, LOOK_STRENGTH * dt)

    const lookPoint = camera.position.clone().add(currentLook)

    camera.lookAt(lookPoint)

    const distance = camera.position.distanceTo(desiredPosition.current)

    if (distance < 0.08) {

      camera.position.copy(desiredPosition.current)
      camera.lookAt(target.current)

      setInteractionLock(false)

    }

  })

  return null
}