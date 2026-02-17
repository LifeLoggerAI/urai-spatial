"use client"
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
export default () => <EffectComposer disableNormalPass><Bloom intensity={1.6} luminanceThreshold={0.85} mipmapBlur /><Vignette darkness={0.8} /></EffectComposer>;
