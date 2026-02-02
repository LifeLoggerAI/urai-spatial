'use client';

import { XR, ARButton } from "@react-three/xr";
import { Canvas } from "@react-three/fiber";
import SpatialSceneKit from "@/components/spatial/SpatialSceneKit";

export default function RitualARPage() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "black" }}>
      <ARButton />
      <Canvas>
        <XR>
          <SpatialSceneKit mode="ritualAR" />
        </XR>
      </Canvas>
    </div>
  );
}
