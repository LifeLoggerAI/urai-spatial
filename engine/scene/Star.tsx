"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface StarProps {
  starData: { id: number; position: [number, number, number] }
  isSelected: boolean
  isDimmed?: boolean
  onClick: (id: number) => void
}

const BASE_COLOR = new THREE.Color("#8fb3ff")
const SELECTED_COLOR = new THREE.Color("#ffffff")
const DIM_COLOR = new THREE.Color("#1a1a1a")

const LERP_SPEED = 0.08

export function Star({ starData, isSelected, isDimmed = false, onClick }: StarProps) {

  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const positionVec = useMemo(
    () => new THREE.Vector3(...starData.position),
    [starData.position]
  )

  useFrame(() => {

    const m = materialRef.current
    if (!m) return

    if (isSelected) {

      m.color.lerp(SELECTED_COLOR, LERP_SPEED)

    } else if (isDimmed) {

      m.color.lerp(DIM_COLOR, LERP_SPEED)

    } else {

      m.color.lerp(BASE_COLOR, LERP_SPEED)

    }

  })

  return (

    <group position={positionVec}>

      {/* star core */}
      <mesh
        raycast={THREE.Mesh.prototype.raycast}
        onPointerDown={(e) => {
          e.stopPropagation()
          onClick(starData.id)
        }}
      >
        <sphereGeometry args={[0.9, 24, 24]} />

        <meshBasicMaterial
          ref={materialRef}
          color={BASE_COLOR}
        />
      </mesh>

      {/* star glow */}
      <mesh scale={[4.5, 4.5, 4.5]}>
        <sphereGeometry args={[0.9, 16, 16]} />

        <meshBasicMaterial
          color="#8fb3ff"
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>

    </group>

  )
}