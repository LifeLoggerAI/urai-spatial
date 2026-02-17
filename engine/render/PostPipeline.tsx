"use client"
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
export default () => <EffectComposer disableNormalPass><Bloom intensity={0.5} luminanceThreshold={0.5} mipmapBlur /><Vignette darkness={0.8} /></EffectComposer>;
