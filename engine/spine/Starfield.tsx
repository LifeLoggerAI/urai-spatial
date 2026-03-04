"use client"

import { useRef, useEffect, useMemo } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/useSpatialStore"

export default function Starfield() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  // 20 deterministic stars directly in front of camera
  const stars = useMemo(() => {
    const arr = []
    for (let i = 0; i < 20; i++) {
      arr.push({
        x: (i - 10) * 10,
        y: 0,
        z: 0
      })
    }
    return arr
  }, [])

  const selectedStarId = useSpatialStore((s) => s.selectedStarId)
  const selectStar = useSpatialStore((s) => s.selectStar)

  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(5, 16, 16)
    g.computeBoundingSphere()
    return g
  }, [])

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: "white" })
  }, [])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()

    stars.forEach((star, i) => {
      dummy.position.set(star.x, star.y, star.z)
      dummy.scale.setScalar(i === selectedStarId ? 1.5 : 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  }, [selectedStarId, stars])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, stars.length]}
      raycast={THREE.InstancedMesh.prototype.raycast}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.instanceId !== undefined) {
          selectStar(e.instanceId)
        }
      }}
    />
  )
}
