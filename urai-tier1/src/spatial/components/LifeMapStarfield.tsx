'use client'
import { resolveDepthScale } from '@/spatial/canon/tier2Canon'

import React, { useMemo } from 'react'
import * as THREE from 'three'

type VisualStar = {
  id: string
  position: [number, number, number]
  size: number
  alpha: number
  tone: string
  band?: 'near' | 'mid' | 'far'
}

export type LifeMapStarfieldProps = {
  visible?: boolean
  stars: VisualStar[]
  selectedStarId?: string | null
  onSelectStar: (id: string) => void
}

type SupportStar = {
  position: [number, number, number]
  scale: number
  opacity: number
  color: string
}

function buildSupportStars(count: number): SupportStar[] {
  const data: SupportStar[] = []
  for (let i = 0; i < count; i += 1) {
    const x = Math.sin(i * 1.618) * (7 + (i % 13) * 0.86)
    const y = Math.cos(i * 1.113) * (3.5 + (i % 9) * 0.52)
    const z = -18 - ((i * 7) % 38)
    const hue = 0.58 + (i % 7) * 0.012
    const color = new THREE.Color().setHSL(hue, 0.45, 0.74).getStyle()
    data.push({
      position: [x, y, z],
      scale: 0.018 + (i % 5) * 0.01,
      opacity: 0.12 + (i % 6) * 0.06,
      color,
    })
  }
  return data
}

export default function LifeMapStarfield({
  visible = true,
  stars,
  selectedStarId,
  onSelectStar,
}: LifeMapStarfieldProps) {
  const supportStars = useMemo(() => buildSupportStars(360), [])

  return (
    <group visible={visible}>
      <mesh position={[0, 0, -34]}>
        <sphereGeometry args={[72, 56, 56]} />
        <meshBasicMaterial
          color="#010611"
          transparent
          opacity={0.96}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 1.6, -30]} rotation={[0.36, 0.18, 0.08]}>
        <torusGeometry args={[18, 2.8, 24, 140]} />
        <meshBasicMaterial
          color="#102544"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[-2.5, -0.8, -25]} rotation={[0.28, -0.22, 0.2]}>
        <torusGeometry args={[11.8, 1.8, 20, 110]} />
        <meshBasicMaterial
          color="#17325f"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[2.2, 0.2, -23]}>
        <sphereGeometry args={[8.5, 28, 28]} />
        <meshBasicMaterial
          color="#11254a"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[-4.4, 1.8, -29]}>
        <sphereGeometry args={[10.8, 28, 28]} />
        <meshBasicMaterial
          color="#0d1f3d"
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      {supportStars.map((star, idx) => (
        <mesh key={`support-star-${idx}`} position={star.position} scale={star.scale}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial
            color={star.color}
            transparent
            opacity={star.opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {stars.map((star) => {
        const selected = star.id === selectedStarId
        const haloScale = selected ? star.size * 8.4 : star.size * 4.6
        const ringOuter = selected ? star.size * 10.5 : star.size * 6.2
        const ringInner = selected ? star.size * 8.4 : star.size * 4.9

        return (
          <group
            key={star.id}
            position={star.position}
            onClick={(event) => {
              event.stopPropagation()
              onSelectStar(star.id)
            }}
          >
            <mesh scale={selected ? star.size * 1.55 : star.size}>
              <sphereGeometry args={[1, 20, 20]} />
              <meshBasicMaterial
                color={star.tone}
                transparent
                opacity={selected ? 1 : star.alpha}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            <mesh scale={haloScale}>
              <sphereGeometry args={[1, 20, 20]} />
              <meshBasicMaterial
                color={star.tone}
                transparent
                opacity={selected ? 0.18 : 0.06}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[ringInner, ringOuter, 48]} />
              <meshBasicMaterial
                color={selected ? '#dfeaff' : '#7fa8ff'}
                transparent
                opacity={selected ? 0.34 : 0.08}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
