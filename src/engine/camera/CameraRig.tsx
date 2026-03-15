"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../../stores/spatialStore"

const HOME_POSITION = new THREE.Vector3(0, 2, 16)
const HOME_LOOK_AT = new THREE.Vector3(0, 0, 0)

export default function CameraRig() {
  const { camera } = useThree()

  const selectedStar = useSpatialStore((s) => s.selectedStar)

  const desiredPosition = useRef(new THREE.Vector3())
  const desiredLookAt = useRef(new THREE.Vector3())
  const smoothLookAt = useRef(new THREE.Vector3())

  const starOffset = useMemo(() => new THREE.Vector3(0, 1.8, 6), [])

  useFrame((_, delta) => {
    const posLerp = 1 - Math.exp(-4 * delta)
    const lookLerp = 1 - Math.exp(-6 * delta)

    if (selectedStar) {
      desiredLookAt.current.set(
        selectedStar.position[0],
        selectedStar.position[1],
        selectedStar.position[2]
      )

      desiredPosition.current.set(
        selectedStar.position[0] + starOffset.x,
        selectedStar.position[1] + starOffset.y,
        selectedStar.position[2] + starOffset.z
      )
    } else {
      desiredPosition.current.copy(HOME_POSITION)
      desiredLookAt.current.copy(HOME_LOOK_AT)
    }

    camera.position.lerp(desiredPosition.current, posLerp)
    smoothLookAt.current.lerp(desiredLookAt.current, lookLerp)
    camera.lookAt(smoothLookAt.current)
  })

  return null
}