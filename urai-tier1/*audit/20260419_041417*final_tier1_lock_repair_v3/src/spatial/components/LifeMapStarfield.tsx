"use client";

import { useMemo } from "react";
import type { StarPoint } from "@/lib/uraiCanon/types";

export type LifeMapStarfieldProps = {
  visible?: boolean;
  stars?: StarPoint[];
  selectedStarId?: string | null;
  onSelectStar?: (starId: string) => void;
  onHoverStar?: (starId: string | null) => void;
  focusSuppression?: number;
};

function buildFallbackStars(): StarPoint[] {
  const items: StarPoint[] = [];
  for (let i = 0; i < 36; i += 1) {
    const band = i % 4;
    const z = -22 - band * 18 - Math.floor(i / 4) * 2.4;
    const angle = (i / 36) * Math.PI * 2;
    const radius = 6 + (i % 6) * 1.35 + band * 1.4;
    items.push({
      position: [Math.cos(angle) * radius, Math.sin(angle) * (2 + band * 0.7), z],
      size: 0.18 + band * 0.03,
      color: band % 2 === 0 ? "#d8e4ff" : "#9ec2ff",
      intensity: 0.9 - band * 0.08,
    });
  }
  return items;
}

export function LifeMapStarfield({
  visible = true,
  stars,
  selectedStarId = null,
  onSelectStar,
  onHoverStar,
  focusSuppression = 0,
}: LifeMapStarfieldProps) {
  const resolvedStars = useMemo(() => stars && stars.length > 0 ? stars : buildFallbackStars(), [stars]);
  const haze = Math.max(0, Math.min(0.85, focusSuppression));

  return (
    <group visible={visible}>
      {resolvedStars.map((star, index) => {
        const selected = selectedStarId === star.id;
        const size = selected ? (star.size ?? 0.24) * 1.22 : (star.size ?? 0.24);
        const opacity = selected ? 1 : Math.max(0.24, (star.intensity ?? 0.82) - haze * 0.5);

        return (
          <group key={star.id} position={star.position}>
            <mesh
              onPointerDown={() => onSelectStar?.(star.id)}
              onPointerOver={() => onHoverStar?.(star.id)}
              onPointerOut={() => onHoverStar?.(null)}
            >
              <sphereGeometry args={[size, 20, 20]} />
              <meshBasicMaterial
                color={star.color ?? "#d8e4ff"}
                transparent
                opacity={opacity}
              />
            </mesh>

            <mesh>
              <sphereGeometry args={[size * 2.6, 16, 16]} />
              <meshBasicMaterial
                color={selected ? "#a7c8ff" : "#6b8fd6"}
                transparent
                opacity={selected ? 0.18 : 0.08}
              />
            </mesh>

            {index % 3 === 0 ? (
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <planeGeometry args={[size * 9, size * 0.32]} />
                <meshBasicMaterial color="#d6e7ff" transparent opacity={0.08} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}
