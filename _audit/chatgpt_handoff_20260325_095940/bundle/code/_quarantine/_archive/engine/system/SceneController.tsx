"use client"

import { useSpatialStore } from "../store/spatialStore"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useRef } from "react"

const SKY_POSITION = new THREE.Vector3(0, 0, 6)
const SKY_TARGET = new THREE.Vector3(0, 0, 0)
const LERP = 0.08

export default function SceneController() {
  const { camera } = useThree()

  const { selectedStar: star, mode } = useSpatialStore(s => ({
    selectedStar: s.selectedStar,
    mode: s.mode,
  }))

  const desired = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const quat = useRef(new THREE.Quaternion())

  useFrame(() => {
    if (mode === "map") {
      // Smooth position lerp
      camera.position.lerpVectors(camera.position, SKY_POSITION, LERP)

      // Smooth rotation slerp
      camera.quaternion.slerp(
        quat.current.setFromRotationMatrix(
          new THREE.Matrix4().lookAt(camera.position, SKY_TARGET, camera.up)
        ),
        LERP
      )
      return
    }

    if (!star || !star.position) return

    const [x, y, z] = star.position

    target.current.set(x, y, z)
    desired.current.set(x, y, z + 2.9)

    // Smooth camera movement
    camera.position.lerpVectors(camera.position, desired.current, LERP)

    // Smooth camera rotation
    camera.quaternion.slerp(
      quat.current.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(camera.position, target.current, camera.up)
      ),
      LERP
    )
  })

  return null
}