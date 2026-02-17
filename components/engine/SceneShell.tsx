
"use client"

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import SceneRouter, { SceneType } from "./SceneRouter";
import PostPipeline from "@/components/post/PostPipeline";

export default function SceneShell() {
  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
    <Canvas
      style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh" }}
      shadows
      camera={{ position: [0, 0, 3], fov: 45 }}
      gl={{ antialias: true }}
    >
      <Suspense fallback={null}>
        <SceneRouter scene={"home"} setScene={() => {}} />
        <PostPipeline />
      </Suspense>
    </Canvas>
    </div>
  );
}
