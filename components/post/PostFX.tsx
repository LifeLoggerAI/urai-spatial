
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react';

export default function PostFX() {
  const { scene } = useThree()
  const exposure = useRef(1)

  useFrame((state) => {
    exposure.current = 1 + Math.sin(state.clock.elapsedTime * 0.4) * 0.03
    state.gl.toneMappingExposure = exposure.current
  })


  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.6}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.5}
        mipmapBlur
      />
      <Bloom
        luminanceThreshold={0.1}
        luminanceSmoothing={0.8}
        intensity={0.2}
        mipmapBlur
      />

      <DepthOfField
        focusDistance={0.02}
        focalLength={0.03}
        bokehScale={2}
        height={480}
      />

      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0005, 0.0005]}
      />

      <Noise opacity={0.02} />

      <Vignette eskil={false} offset={0.1} darkness={0.5} />
    </EffectComposer>
  )
}
