"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";

export default function Ground() {
  const mode = useSceneStore((s) => s.mode);

  const config = useMemo(() => {
    if (mode === "focus") {
      return {
        y: -42,
        radius: 2200,
        opacity: 0.09,
        color: "#0a1220",
      };
    }

    if (mode === "lifemap") {
      return {
        y: -58,
        radius: 3200,
        opacity: 0.05,
        color: "#07101b",
      };
    }

    return {
      y: -72,
      radius: 4200,
      opacity: 0.03,
      color: "#05080d",
    };
  }, [mode]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.y, 0]}>
      <circleGeometry args={[config.radius, 96]} />
      <meshBasicMaterial
        color={config.color}
        transparent
        opacity={config.opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
