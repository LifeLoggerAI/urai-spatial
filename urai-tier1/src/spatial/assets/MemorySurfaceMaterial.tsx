'use client'

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import { createLivingMemoryMaterial } from './livingMemoryMaterial'

export function MemorySurfaceMaterial({ color, opacity = 1, reducedMotion }: { color: string; opacity?: number; reducedMotion: boolean }) {
  const surface = useMemo(() => {
    const result = createLivingMemoryMaterial(opacity >= .95)
    const accent = new Color(color)
    const mineral = new Color('#4d5b51')
    const weathered = new Color('#778176')
    result.material.color.copy(accent).lerp(mineral, .62).lerp(weathered, .16)
    result.material.emissive.copy(accent).lerp(new Color('#18241f'), .68)
    result.material.emissiveIntensity = .008
    result.material.opacity = opacity
    result.material.roughness = .88
    result.material.metalness = 0
    return result
  }, [color, opacity])
  useEffect(() => () => surface.material.dispose(), [surface])
  useFrame(({ clock }) => { surface.time.value = reducedMotion ? 0 : clock.elapsedTime * .42 })
  return <primitive object={surface.material} attach="material" />
}
