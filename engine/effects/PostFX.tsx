"use client"

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"

export default function PostFX(){

  return(

    <EffectComposer
      disableNormalPass
      multisampling={8}
      autoClear={false}
    >

      {/* star and nebula glow */}

      <Bloom
        intensity={1.1}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.9}
        radius={0.8}
      />

      {/* deep-space vignette */}

      <Vignette
        eskil={false}
        offset={0.25}
        darkness={0.75}
      />

    </EffectComposer>

  )

}