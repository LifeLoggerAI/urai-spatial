'use client'

import { useThree, useFrame } from "@react-three/fiber"
import { Vector3 } from "three"
import { useRef } from "react"

import { useSpatialStore } from "../state/spatialStore"
import { demoData } from "../data/demoData"

export default function CameraRig(){

  const { camera } = useThree()

  const selectedStarId = useSpatialStore((s) => s.selectedStarId)

  const target = useRef(new Vector3())
  const home = useRef(new Vector3(0, 2, 16))
  const desired = useRef(new Vector3())
  const velocity = useRef(new Vector3())

  const STOP_DISTANCE = 3
  const DAMP = 0.12

  useFrame(() => {

    if (selectedStarId !== null) {

      const star = demoData.find(s => s.id === selectedStarId)

      if (star) {

        target.current.set(
          star.position[0],
          star.position[1],
          star.position[2]
        )

        desired.current.set(
          target.current.x,
          target.current.y,
          target.current.z + STOP_DISTANCE
        )

        camera.lookAt(
          target.current.x,
          target.current.y,
          target.current.z
        )

      }

    } else {

      desired.current.copy(home.current)

      camera.lookAt(0, 0, -5)

    }

    velocity.current
      .subVectors(desired.current, camera.position)
      .multiplyScalar(DAMP)

    camera.position.add(velocity.current)

  })

  return null
}