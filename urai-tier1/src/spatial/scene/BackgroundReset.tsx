"use client";

import { useSceneStore } from "../store/useSceneStore";

export default function BackgroundReset() {
  const clearFocusedStar = useSceneStore((s) => s.clearFocusedStar);
  const sceneMode = useSceneStore((s) => s.sceneMode);

  return (
    <mesh
      position={[0, 0, -50]}
      onClick={(e) => {
        e.stopPropagation();
        clearFocusedStar();
      }}
      renderOrder={-100}
      visible={sceneMode !== "replay"}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
