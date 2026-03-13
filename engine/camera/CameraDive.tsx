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
  const offset = useRef(new THREE.Vector3(0, 0, 2.5))

  useFrame(() => {

    if (!selectedStarId) return
    if (!interactionLock) return

    const star = demoData.find((s) => s.id === selectedStarId)
    if (!star) return

    target.current.set(
      star.position[0],
      star.position[1],
      star.position[2]
    )

    desiredPosition.current.copy(target.current).add(offset.current)

    camera.position.lerp(desiredPosition.current, 0.08)
    camera.lookAt(target.current)

    const distance = camera.position.distanceTo(desiredPosition.current)

    if (distance < 0.05) {
      setInteractionLock(false)
    }

  })

  return null
}