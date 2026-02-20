'use client';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  GodRays,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Mesh } from 'three'

interface BloomEffectsProps {
  orbRef: React.RefObject<Mesh>
}

export default function BloomEffects({ orbRef }: BloomEffectsProps) {
  if (!orbRef.current) return null

  return (
    <EffectComposer>
      <GodRays
        // @ts-ignore
        sun={orbRef.current}
        blendFunction={BlendFunction.SCREEN}
        samples={60}
        density={0.97}
        decay={0.97}
        weight={0.6}
        exposure={0.4}
        clampMax={1}
      />
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.1}
        luminanceSmoothing={0.9}
        height={480}
      />
      <DepthOfField
        focusDistance={0}
        focalLength={0.02}
        bokehScale={2}
        height={480}
      />
    </EffectComposer>
  )
}
