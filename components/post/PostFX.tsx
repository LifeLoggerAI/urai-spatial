'use client'

import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export default function PostFX() {
  const { gl } = useThree()

  useEffect(() => {
    const prevExposure = gl.toneMappingExposure
    gl.toneMappingExposure = 1

    return () => {
      gl.toneMappingExposure = prevExposure
    }
  }, [gl])

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={1.1}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.45}
        mipmapBlur
      />

      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.00035, 0.00035]}
      />

      <Noise opacity={0.015} />

      <Vignette
        eskil={false}
        offset={0.12}
        darkness={0.45}
      />
    </EffectComposer>
  )
}