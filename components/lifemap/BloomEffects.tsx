import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

export default function BloomEffects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.5} // The bloom intensity.
        luminanceThreshold={0.1} // luminance threshold. Raise this to mask out darker elements in the scene.
        luminanceSmoothing={0.025} // smoothness of the luminance threshold. Range is [0, 1]
        mipmapBlur // Enables mipmap blur for a more performant blur effect
      />
      <Vignette
        eskil={false} // Use a smooth, circular vignette
        offset={0.1} // Vignette offset
        darkness={0.5} // Vignette darkness
      />
    </EffectComposer>
  );
}
