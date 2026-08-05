"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { Suspense } from "react";
import * as THREE from "three";

export default function ThreeSceneRoot({ children }: { children: ReactNode }) {
  return (
    <div
      className="urai-three-scene-root"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "radial-gradient(circle at 50% 32%, #152653 0%, #060914 42%, #02030a 100%)",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.65, 8.8], fov: 42, near: 0.05, far: 1200 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl, scene }) => {
          gl.toneMappingExposure = 1.08;
          scene.background = new THREE.Color("#02030a");
          scene.fog = new THREE.FogExp2("#050818", 0.0135);
        }}
      >
        <ambientLight intensity={0.22} color="#8aa8ff" />
        <hemisphereLight args={["#9edfff", "#050713", 0.65]} />
        <directionalLight
          castShadow
          position={[-8, 12, 9]}
          intensity={1.5}
          color="#b8ddff"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={90}
          shadow-camera-left={-28}
          shadow-camera-right={28}
          shadow-camera-top={28}
          shadow-camera-bottom={-28}
        />
        <pointLight position={[8, 4, -12]} intensity={14} distance={38} decay={2} color="#7b76ff" />
        <pointLight position={[-9, 2, -8]} intensity={10} distance={30} decay={2} color="#59d7ff" />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
