/**
 * URAI Tier 1 LOCK
 * Deterministic starfield + camera glide
 * DO NOT MODIFY WITHOUT EXPLICIT EXPANSION AUTHORIZATION
 */

"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useRef, useEffect } from "react"
import * as THREE from "three"
import { STAR_POSITIONS, STAR_COUNT } from "../stars/deterministicStars"
import { cameraTarget } from "../camera/cameraStore"

const BASE_SCALE = 1
const DIM_SCALE = 0.35
const SELECT_SCALE = 2.5
const DIM_DURATION = 0.6
const CAMERA_OFFSET = 8

export default function Starfield() {
  const { camera } = useThree()
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const selectedRef = useRef<number | null>(null)
  const pendingSelection = useRef<number | null>(null)

  const dimElapsed = useRef(0)
  const dimming = useRef(false)

  const dummy = new THREE.Object3D()
  const center = new THREE.Vector3()
  const direction = new THREE.Vector3()

  useEffect(() => {
    const mesh = meshRef.current

    for (let i = 0; i < STAR_COUNT; i++) {
      dummy.position.copy(STAR_POSITIONS[i])
      dummy.scale.setScalar(BASE_SCALE)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, delta) => {

    if (pendingSelection.current !== null) {
      const id = pendingSelection.current
      pendingSelection.current = null

      selectedRef.current = id
      dimElapsed.current = 0
      dimming.current = true

      const starPos = STAR_POSITIONS[id]
      direction.subVectors(starPos, center).normalize()

      cameraTarget.position.copy(starPos)
      cameraTarget.position.add(direction.multiplyScalar(CAMERA_OFFSET))
      cameraTarget.lookAt.copy(starPos)
      cameraTarget.active = true
    }

    if (dimming.current && selectedRef.current !== null) {
      dimElapsed.current += delta
      const t = Math.min(dimElapsed.current / DIM_DURATION, 1)

      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2

      for (let i = 0; i < STAR_COUNT; i++) {
        const target =
          i === selectedRef.current
            ? SELECT_SCALE
            : DIM_SCALE

        const scale = THREE.MathUtils.lerp(BASE_SCALE, target, eased)

        dummy.position.copy(STAR_POSITIONS[i])
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }

      meshRef.current.instanceMatrix.needsUpdate = true

      if (t >= 1) dimming.current = false
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({ color: "white" }),
        STAR_COUNT
      ]}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.instanceId === undefined) return
        pendingSelection.current = e.instanceId
      }}
    />
  )
}
