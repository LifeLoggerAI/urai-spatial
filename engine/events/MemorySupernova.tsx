
"use client"

import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"

export default function MemorySupernova() {
  const selectedStar = useSpatialStore(s => s.selectedStar)
  const ref = useRef<THREE.Mesh>(null!)
  const initialTime = useRef(0)

  const isActive = useMemo(() => {
    if (selectedStar) {
      initialTime.current = Date.now()
      return true
    }
    return false
  }, [selectedStar])

  useFrame(() => {
    if (!ref.current || !isActive || !selectedStar) {
        if(ref.current) ref.current.visible = false
        return
    }
    
    ref.current.visible = true
    const elapsedTime = (Date.now() - initialTime.current) / 1000
    const scale = 1 + elapsedTime * 2
    const opacity = Math.max(0, 1 - elapsedTime / 2)

    ref.current.scale.set(scale, scale, scale)
    ref.current.position.set(selectedStar.position[0], selectedStar.position[1], selectedStar.position[2])
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity = opacity

    if (opacity <= 0) {
        ref.current.visible = false
    }
  })

  return (
    <mesh ref={ref} visible={false}>
      <ringGeometry args={[0.5, 0.6, 32]} />
      <meshBasicMaterial
        color="#ffffff"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        transparent
      />
    </mesh>
  )
}
