
"use client"

import { EffectComposer, SVGF } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export default function PostPipeline() {
  return (
    <EffectComposer>
      <SVGF
        intensity={1.0}
        luminanceInfluence={0.1}
        radius={0.2}
        depthFade={0.9}
        blur={0.5}
      />
    </EffectComposer>
  );
}
