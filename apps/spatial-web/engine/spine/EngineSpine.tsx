"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { useRef, useEffect } from "react"
import * as THREE from "three"
import { STAR_POSITIONS, STAR_COUNT } from "../stars/deterministicStars"
import CameraRig from "../camera/CameraRig"
import { cameraTarget } from "../camera/cameraStore"

const BASE_SCALE = 1
const SELECT_SCALE = 2
const CAMERA_OFFSET = 8

function Starfield() {
  const { camera } = useThree()
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const selectedRef = useRef<number | null>(null)
  const dummy = new THREE.Object3D()

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

  const setScale = (id: number, scale: number) => {
    dummy.position.copy(STAR_POSITIONS[id])
    dummy.scale.setScalar(scale)
    dummy.updateMatrix()
    meshRef.current.setMatrixAt(id, dummy.matrix)
    meshRef.current.instanceMatrix.needsUpdate = true
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, STAR_COUNT]}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.instanceId === undefined) return

        const id = e.instanceId

        if (selectedRef.current !== null) {
          setScale(selectedRef.current, BASE_SCALE)
        }

        setScale(id, SELECT_SCALE)
        selectedRef.current = id

        const starPos = STAR_POSITIONS[id]

        // Stable radial offset from scene center (0,0,0)
        const direction = new THREE.Vector3()
        direction.subVectors(starPos, new THREE.Vector3(0, 0, 0)).normalize()

        cameraTarget.position.copy(starPos)
        cameraTarget.position.add(
          direction.multiplyScalar(CAMERA_OFFSET)
        )

        cameraTarget.lookAt.copy(starPos)
        cameraTarget.active = true
      }}
    >
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="white" />
    </instancedMesh>
  )
}

export default function EngineSpine() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "black" }}>
      <Canvas camera={{ position: [0, 0, 60], fov: 60 }}>
        <CameraRig />
        <Starfield />
      </Canvas>
    </div>
  )
}
