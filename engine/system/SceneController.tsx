"use client"

import { useSpatialStore } from "../store/spatialStore"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useRef } from "react"

const SKY_POSITION = new THREE.Vector3(0, 0, 6)
const LERP = 0.08

export default function SceneController() {

  const { camera } = useThree()

  const star = useSpatialStore(s => s.selectedStar)
  const mode = useSpatialStore(s => s.mode)

  const desired = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())

  useFrame(() => {

    if (mode === "map") {

      camera.position.lerp(SKY_POSITION, LERP)
      camera.lookAt(0, 0, 0)
      return

    }

    if (!star || !star.position) return

    const [x, y, z] = star.position

    target.current.set(x, y, z)
    desired.current.set(x, y, z + 2.9)

    camera.position.lerp(desired.current, LERP)
    camera.lookAt(target.current)

  })

  return null
}