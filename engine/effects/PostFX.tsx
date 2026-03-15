"use client"

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"

export default function PostFX() {
  return (
    <EffectComposer
      disableNormalPass
      multisampling={4}
      autoClear={false}
    >
      <Bloom
        intensity={0.9}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.2}
        radius={0.7}
      />

      <Vignette
        eskil={false}
        offset={0.2}
        darkness={0.65}
      />
    </EffectComposer>
  )
}