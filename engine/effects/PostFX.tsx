'use client'

import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useState, useEffect } from "react";

export default function PostFX() {

  const { gl } = useThree();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (gl) setReady(true);
  }, [gl]);

  if (!ready) return null;

  return (
    <EffectComposer disableNormalPass>
      <Bloom
        intensity={0.6}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
      />
    </EffectComposer>
  );
}