'use client'

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { createLivingMemoryMaterial } from './livingMemoryMaterial'

export function MemorySurfaceMaterial({ color, opacity = 1, reducedMotion }: { color: string; opacity?: number; reducedMotion: boolean }) {
  const surface = useMemo(() => {
    const result = createLivingMemoryMaterial(opacity >= .95)
    result.material.color.set(color)
    result.material.emissive.set(color)
    result.material.emissiveIntensity = .08
    result.material.opacity = opacity
    result.material.roughness = .56
    return result
  }, [color, opacity])
  useEffect(() => () => surface.material.dispose(), [surface])
  useFrame(({ clock }) => { surface.time.value = reducedMotion ? 0 : clock.elapsedTime })
  return <primitive object={surface.material} attach="material" />
}
