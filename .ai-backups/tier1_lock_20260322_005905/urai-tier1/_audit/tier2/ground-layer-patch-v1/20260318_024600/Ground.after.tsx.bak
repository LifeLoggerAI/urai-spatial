"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";

type GroundConfig = {
  y: number;
  radius: number;
  baseOpacity: number;
  innerRadius: number;
  innerOpacity: number;
  rimInner: number;
  rimOuter: number;
  rimOpacity: number;
  horizonY: number;
  horizonZ: number;
  horizonRadius: number;
  horizonOpacity: number;
  color: string;
  accent: string;
};

export default function Ground() {
  const mode = useSceneStore((s) => s.mode);

  const config = useMemo<GroundConfig>(() => {
    if (mode === "replay") {
      return {
        y: -7.95,
        radius: 108,
        baseOpacity: 0.16,
        innerRadius: 28,
        innerOpacity: 0.11,
        rimInner: 34,
        rimOuter: 108,
        rimOpacity: 0.065,
        horizonY: 16,
        horizonZ: -48,
        horizonRadius: 96,
        horizonOpacity: 0.05,
        color: "#0a1220",
        accent: "#1a2842",
      };
    }

    if (mode === "focus") {
      return {
        y: -7.95,
        radius: 104,
        baseOpacity: 0.14,
        innerRadius: 24,
        innerOpacity: 0.09,
        rimInner: 30,
        rimOuter: 104,
        rimOpacity: 0.055,
        horizonY: 15,
        horizonZ: -44,
        horizonRadius: 92,
        horizonOpacity: 0.045,
        color: "#09111d",
        accent: "#16243b",
      };
    }

    if (mode === "lifemap") {
      return {
        y: -8.05,
        radius: 116,
        baseOpacity: 0.10,
        innerRadius: 20,
        innerOpacity: 0.06,
        rimInner: 28,
        rimOuter: 116,
        rimOpacity: 0.045,
        horizonY: 13,
        horizonZ: -58,
        horizonRadius: 110,
        horizonOpacity: 0.04,
        color: "#07101b",
        accent: "#132033",
      };
    }

    if (mode === "sky") {
      return {
        y: -8.1,
        radius: 98,
        baseOpacity: 0.07,
        innerRadius: 18,
        innerOpacity: 0.04,
        rimInner: 24,
        rimOuter: 98,
        rimOpacity: 0.035,
        horizonY: 18,
        horizonZ: -54,
        horizonRadius: 104,
        horizonOpacity: 0.055,
        color: "#060c15",
        accent: "#111b2b",
      };
    }

    return {
      y: -7.95,
      radius: 100,
      baseOpacity: 0.12,
      innerRadius: 22,
      innerOpacity: 0.07,
      rimInner: 28,
      rimOuter: 100,
      rimOpacity: 0.05,
      horizonY: 15,
      horizonZ: -46,
      horizonRadius: 92,
      horizonOpacity: 0.04,
      color: "#08101a",
      accent: "#152235",
    };
  }, [mode]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.y, 0]} renderOrder={-2}>
        <circleGeometry args={[config.radius, 96]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={config.baseOpacity}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.y + 0.05, 0]} renderOrder={-1}>
        <circleGeometry args={[config.innerRadius, 64]} />
        <meshBasicMaterial
          color={config.accent}
          transparent
          opacity={config.innerOpacity}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, config.y + 0.02, 0]} renderOrder={-1}>
        <ringGeometry args={[config.rimInner, config.rimOuter, 96]} />
        <meshBasicMaterial
          color={config.accent}
          transparent
          opacity={config.rimOpacity}
          depthWrite={false}
        />
      </mesh>

      <mesh
        position={[0, config.horizonY, config.horizonZ]}
        rotation={[Math.PI * 0.46, 0, 0]}
        renderOrder={-3}
      >
        <circleGeometry args={[config.horizonRadius, 72]} />
        <meshBasicMaterial
          color={config.accent}
          transparent
          opacity={config.horizonOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
