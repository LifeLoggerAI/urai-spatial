"use client";

import { useEffect } from "react";
import { Color, FogExp2 } from "three";
import { useThree } from "@react-three/fiber";

export default function Tier1Lights() {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new Color("#060816");
    scene.fog = new FogExp2("#060816", 0.022);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.24} />
      <hemisphereLight args={["#7aa2ff", "#0a0714", 0.42]} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={1.45}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 1.8, 0.8]} intensity={1.2} distance={10} />
      <pointLight position={[0, 0.3, -4]} intensity={0.3} distance={20} />
    </>
  );
}
