'use client'

import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

export default function CinematicPostProcessing({ active }: { active: boolean }) {
  return (
    <EffectComposer multisampling={0} enabled={active}>
      <Bloom intensity={0.82} luminanceThreshold={0.16} luminanceSmoothing={0.62} mipmapBlur />
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new Vector2(0.0008, 0.0006)} />
      <Vignette eskil={false} offset={0.18} darkness={0.72} />
    </EffectComposer>
  )
}
