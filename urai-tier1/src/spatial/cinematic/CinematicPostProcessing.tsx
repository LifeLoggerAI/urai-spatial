'use client'

import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

export default function CinematicPostProcessing({ active, reducedMotion = false }: { active: boolean; reducedMotion?: boolean }) {
  if (!active) return null

  return (
    <EffectComposer multisampling={0} enabled={active}>
      <Bloom
        intensity={reducedMotion ? 0.38 : 0.82}
        luminanceThreshold={reducedMotion ? 0.24 : 0.16}
        luminanceSmoothing={0.62}
        mipmapBlur={!reducedMotion}
      />
      {!reducedMotion ? <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new Vector2(0.0008, 0.0006)} /> : null}
      <Vignette eskil={false} offset={0.18} darkness={reducedMotion ? 0.5 : 0.72} />
    </EffectComposer>
  )
}
