"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const CONES = 120

type ConeTransform = {
  position: THREE.Vector3
  rotation: THREE.Euler
  speed: number
  phase: number
}

function seededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export default function StarLightCones() {
  const groupRef = useRef<THREE.Group>(null!)

  const { geometry, material, transforms } = useMemo(() => {
    const geometry = new THREE.ConeGeometry(2.4, 70, 8, 1, true)
    geometry.translate(0, -35, 0) // anchor beam at base

    const material = new THREE.MeshBasicMaterial({
      color: "#dbe6ff",
      transparent: true,
      opacity: 0.02,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    const rand = seededRandom(1337)

    const transforms: ConeTransform[] = Array.from({ length: CONES }, () => ({
      position: new THREE.Vector3(
        (rand() - 0.5) * 600,
        (rand() - 0.5) * 200,
        (rand() - 0.5) * 600
      ),
      rotation: new THREE.Euler(
        rand() * Math.PI,
        rand() * Math.PI,
        0
      ),
      speed: 0.001 + rand() * 0.001,
      phase: rand() * Math.PI * 2,
    }))

    return { geometry, material, transforms }
  }, [])

  useFrame((state) => {
    const group = groupRef.current
    const t = state.clock.elapsedTime

    for (let i = 0; i < group.children.length; i++) {
      const mesh = group.children[i] as THREE.Mesh
      const data = transforms[i]

      mesh.rotation.y += data.speed

      const pulse = 0.018 + Math.sin(t * 1.4 + data.phase) * 0.008
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = pulse
    }
  })

  return (
    <group ref={groupRef}>
      {transforms.map((t, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material.clone()}
          position={t.position}
          rotation={t.rotation}
        />
      ))}
    </group>
  )
}