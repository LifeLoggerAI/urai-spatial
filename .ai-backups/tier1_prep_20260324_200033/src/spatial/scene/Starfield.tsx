"use client";

import * as THREE from "three";
import { useMemo } from "react";

export type SpatialStar = {
  id: string;
  position: [number, number, number];
  size: number;
  color: string;
  band: "near" | "mid" | "far";
  title: string;
  chapter: string;
};

type ScenePhase = "home" | "ascent" | "lifemap" | "focus" | "replay";

type StarfieldProps = {
  stars: SpatialStar[];
  phase: ScenePhase;
  selectedId: string | null;
  hoveredId: string | null;
  travel: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

export default function Starfield({
  stars,
  phase,
  selectedId,
  hoveredId,
  travel,
  onSelect,
  onHover,
}: StarfieldProps) {
  const ordered = useMemo(() => {
    const rank = { far: 0, mid: 1, near: 2 } as const;
    return [...stars].sort((a, b) => rank[a.band] - rank[b.band]);
  }, [stars]);

  return (
    <group>
      {ordered.map((star) => {
        const isSelected = star.id === selectedId;
        const isHovered = star.id === hoveredId;
        const isOther = selectedId !== null && !isSelected;

        const depthShift =
          star.band === "near" ? travel * 10.5 :
          star.band === "mid" ? travel * 6.2 :
          travel * 2.8;

        const xDrift =
          star.band === "near" ? travel * 1.45 :
          star.band === "mid" ? travel * 0.72 :
          travel * 0.2;

        const yDrift =
          star.band === "near" ? travel * -0.45 :
          star.band === "mid" ? travel * -0.18 :
          0;

        const pos: [number, number, number] = [
          star.position[0] + xDrift,
          star.position[1] + yDrift,
          star.position[2] + depthShift,
        ];

        const phaseOpacity =
          phase === "home" ? 0.04 :
          phase === "ascent" ? (star.band === "near" ? 0.82 : star.band === "mid" ? 0.54 : 0.28) :
          phase === "lifemap" ? 1 :
          phase === "focus" ? (isOther ? 0.05 : 0.55) :
          phase === "replay" ? (isOther ? 0.015 : 0.14) :
          1;

        const baseBand =
          star.band === "near" ? 0.98 :
          star.band === "mid" ? 0.7 :
          0.44;

        const opacity = baseBand * phaseOpacity * (isHovered ? 1.15 : 1);
        const scale = star.size * (isSelected ? (phase === "replay" ? 3.4 : 2.7) : isHovered ? 1.55 : 1);
        const glowScale = isSelected ? (phase === "replay" ? 5.8 : 4.2) : isHovered ? 3 : 2.2;
        const glowOpacity = opacity * (isSelected ? (phase === "replay" ? 0.46 : 0.82) : isHovered ? 0.34 : 0.14);

        return (
          <group key={star.id} position={pos}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(star.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHover(null);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(star.id);
              }}
            >
              <sphereGeometry args={[scale, 14, 14]} />
              <meshBasicMaterial
                color={star.color}
                transparent
                opacity={opacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            <mesh>
              <sphereGeometry args={[scale * glowScale, 16, 16]} />
              <meshBasicMaterial
                color={star.color}
                transparent
                opacity={glowOpacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
