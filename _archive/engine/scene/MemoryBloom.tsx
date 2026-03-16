'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  center: THREE.Vector3
  active: boolean
}

export default function MemoryBloom({ center, active }: Props) {

  const groupRef = useRef<THREE.Group>(null!)
  const meshesRef = useRef<THREE.Mesh[]>([])

  const targetScale = useRef(new THREE.Vector3())
  const tempCenter = useRef(new THREE.Vector3())

  const geometry = useMemo(() => new THREE.SphereGeometry(0.05, 8, 8), [])

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#88ccff",
      emissive: "#88ccff",
      emissiveIntensity: 1.6,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  }, [])

  const particles = useMemo(() => {

    const arr: { base: THREE.Vector3 }[] = []
    const count = 40

    for (let i = 0; i < count; i++) {

      const radius = 1 + Math.random() * 1.5
      const angle = Math.random() * Math.PI * 2
      const height = (Math.random() - 0.5) * 1.5

      arr.push({
        base: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        )
      })

    }

    return arr

  }, [])

  useFrame((state) => {

    const group = groupRef.current
    if (!group) return

    const scale = active ? 1 : 0.2
    targetScale.current.set(scale, scale, scale)

    group.scale.lerp(targetScale.current, 0.08)

    tempCenter.current.copy(center)
    group.position.lerp(tempCenter.current, 0.08)

    meshesRef.current.forEach((mesh, i) => {

      const mat = mesh.material as THREE.MeshStandardMaterial

      mat.opacity = THREE.MathUtils.lerp(
        mat.opacity,
        active ? 0.6 : 0,
        0.08
      )

      if (active) {

        const base = particles[i].base

        mesh.position.x = base.x
        mesh.position.z = base.z

        mesh.position.y =
          base.y +
          Math.sin(state.clock.elapsedTime * 1.5 + i) * 0.05

      }

    })

  })

  return (

    <group ref={groupRef} position={center}>

      {particles.map((p, i) => (

        <mesh
          key={i}
          ref={(m) => { if (m) meshesRef.current[i] = m }}
          geometry={geometry}
          material={material.clone()}
          position={p.base}
        />

      ))}

    </group>

  )

}