'use client'

import { EffectComposer, SVGF } from '@react-three/postprocessing'

/**
 * Minimal post-processing pipeline.
 * Uses SVGF temporal denoising for smooth starfield + shader rendering.
 */

export default function PostPipeline() {

  return (
    <EffectComposer multisampling={4}>

      <SVGF
        intensity={1.0}
        luminanceInfluence={0.1}
        radius={0.2}
        depthFade={0.9}
        blur={0.5}
      />

    </EffectComposer>
  )

}