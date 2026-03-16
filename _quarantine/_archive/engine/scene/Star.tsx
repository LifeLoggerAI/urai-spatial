"use client"

import { useRef, forwardRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface StarProps {
  star: { id: number; position: [number, number, number] }
  selected: boolean
  dimOthers: boolean
  onClick: () => void
}

export const Star = forwardRef<THREE.Group, StarProps>(
({ star, selected, dimOthers, onClick }, ref) => {

  const matRef = useRef<THREE.MeshStandardMaterial>(null!)

  const baseColor = useMemo(() => new THREE.Color("#8fb3ff"), [])
  const dimColor = useMemo(() => new THREE.Color("#1a1a1a"), [])
  const white = useMemo(() => new THREE.Color("#ffffff"), [])

  const position = useMemo(() => {
    return new THREE.Vector3(
      star.position[0],
      star.position[1],
      star.position[2]
    )
  }, [star])

  useFrame(({ clock }) => {

    const mat = matRef.current
    if (!mat) return

    if (selected) {

      const pulse = 1.3 + Math.sin(clock.elapsedTime * 2) * 0.25
      mat.emissiveIntensity = pulse

      const c = baseColor.clone().lerp(white, 0.08)
      mat.color.copy(c)

    } else {

      mat.emissiveIntensity = dimOthers ? 0.05 : 0.25

      const c = (dimOthers ? dimColor : baseColor).clone()
      mat.color.copy(c)

    }

  })

  return (

    <group ref={ref} position={position} frustumCulled={false}>

      <mesh
        onPointerDown={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >

        <sphereGeometry args={[0.25, 16, 16]} />

        <meshStandardMaterial
          ref={matRef}
          color={selected ? "#ffffff" : "#8fb3ff"}
          emissive="#ffffff"
          emissiveIntensity={selected ? 1.3 : 0.25}
          roughness={0.4}
          metalness={0}
        />

      </mesh>

      <mesh scale={[3.5, 3.5, 3.5]} frustumCulled={false}>

        <sphereGeometry args={[0.25, 12, 12]} />

        <meshBasicMaterial
          color="#8fb3ff"
          transparent
          opacity={0.65}
          depthWrite={false}
          depthTest={false}
        />

      </mesh>

    </group>

  )

})

Star.displayName = "Star"