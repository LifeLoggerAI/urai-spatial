'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Group } from 'three'

export function BackgroundStars() {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.0001 // Slowest drift
    }
  })
  return (
    <group ref={ref}>
      <Stars radius={200} depth={50} count={3000} factor={2} fade />
    </group>
  )
}

export function MidStars() {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.00015 // Medium drift
    }
  })
  return (
    <group ref={ref}>
      <Stars radius={100} depth={30} count={1500} factor={4} fade />
    </group>
  )
}

export function ForegroundStars() {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.0002 // Fastest drift
    }
  })
  return (
    <group ref={ref}>
      <Stars radius={50} depth={20} count={500} factor={6} fade />
    </group>
  )
}
