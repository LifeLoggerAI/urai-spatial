"use client"

import { useMemo, useEffect } from "react"
import * as THREE from "three"

const CONE_COUNT = 140

type ConeData = {
  position: [number, number, number]
  rotation: [number, number, number]
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function BrightStarCones() {
  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(4, 70, 12, 1, true)
    geo.translate(0, -35, 0) // anchor at base
    return geo
  }, [])

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.035,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  }, [])

  const cones = useMemo<ConeData[]>(() => {
    const rand = mulberry32(2026)

    return Array.from({ length: CONE_COUNT }, () => {
      const r = 300 + rand() * 400
      const theta = rand() * Math.PI * 2
      const u = rand() * 2 - 1
      const s = Math.sqrt(1 - u * u)

      return {
        position: [
          r * s * Math.cos(theta),
          r * s * Math.sin(theta),
          r * u,
        ],
        rotation: [
          rand() * Math.PI,
          rand() * Math.PI,
          0,
        ],
      }
    })
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return (
    <group>
      {cones.map((cone, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material}
          position={cone.position}
          rotation={cone.rotation}
        />
      ))}
    </group>
  )
}