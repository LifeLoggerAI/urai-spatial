"use client";

import type { JSX } from "react";
import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type ScenePhase = "home" | "lifemap" | "focus" | "replay";

export type StarfieldStar = {
  id: string;
  position: [number, number, number];
  color?: string;
  size?: number;
  title?: string;
  chapter?: string;
  summary?: string;
  band?: "far" | "mid" | "near";
};

type StarfieldProps = {
  stars?: StarfieldStar[];
  visible?: boolean;
  presence?: number;
  interactive?: boolean;
  selectedId?: string | null;
  phase?: ScenePhase;
  onSelectStar?: (star: StarfieldStar) => void;
};

const FALLBACK_STARS: StarfieldStar[] = [
  {
    id: "s1",
    position: [-2.8, 1.2, -18],
    color: "#7fb3ff",
    size: 0.2,
    title: "Origin Point",
    band: "mid",
  },
  {
    id: "s2",
    position: [0.4, 2.4, -24],
    color: "#b7d0ff",
    size: 0.26,
    title: "Signal Rise",
    band: "far",
  },
  {
    id: "s3",
    position: [3.1, 0.9, -22],
    color: "#8ea8ff",
    size: 0.23,
    title: "System Lock",
    band: "far",
  },
  {
    id: "s4",
    position: [-0.8, -0.1, -16],
    color: "#d7e4ff",
    size: 0.18,
    title: "Replay Core",
    band: "near",
  },
];

function inferBand(z: number): "far" | "mid" | "near" {
  if (z <= -22) return "far";
  if (z <= -18) return "mid";
  return "near";
}

export default function Starfield({
  stars,
  visible = true,
  presence = 1,
  interactive = false,
  selectedId = null,
  phase = "lifemap",
  onSelectStar,
}: StarfieldProps): JSX.Element | null {
  const root = useRef<THREE.Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const safeStars = useMemo<StarfieldStar[]>(() => {
    const base = Array.isArray(stars) && stars.length > 0 ? stars : FALLBACK_STARS;
    return base.map((star) => ({
      ...star,
      color: star.color ?? "#dbe7ff",
      size: star.size ?? 0.2,
      band: star.band ?? inferBand(star.position[2]),
    }));
  }, [stars]);

  const ordered = useMemo(() => {
    const rank = { far: 0, mid: 1, near: 2 } as const;
    return [...safeStars].sort((a, b) => rank[a.band ?? "mid"] - rank[b.band ?? "mid"]);
  }, [safeStars]);

  useFrame((state, delta) => {
    if (!root.current) return;

    const targetVisible = visible ? Math.max(0, Math.min(1, presence)) : 0;
    const current = root.current.userData.opacity ?? 0;
    const next = THREE.MathUtils.lerp(current, targetVisible, 1 - Math.exp(-3.2 * delta));
    root.current.userData.opacity = next;
    root.current.visible = next > 0.002;

    for (const child of root.current.children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      if (!mat) continue;

      const materials = Array.isArray(mat) ? mat : [mat];
      for (const material of materials) {
        const m = material as THREE.MeshBasicMaterial;
        if (typeof m.opacity === "number") {
          const baseOpacity = typeof mesh.userData.baseOpacity === "number" ? mesh.userData.baseOpacity : 0.8;
          m.opacity = baseOpacity * next;
        }
      }
    }

    const t = state.clock.getElapsedTime();
    root.current.rotation.y = THREE.MathUtils.lerp(
      root.current.rotation.y,
      phase === "replay" ? 0.05 : phase === "focus" ? 0.025 : 0,
      1 - Math.exp(-1.6 * delta),
    );
    root.current.position.y = Math.sin(t * 0.18) * 0.04 * next;
  });

  if (!ordered.length) return null;

  return (
    <group ref={root} visible={visible}>
      {ordered.map((star) => {
        const size = star.size ?? 0.2;
        const isSelected = selectedId === star.id;
        const isHovered = hoveredId === star.id;
        const scale = isSelected ? 1.9 : isHovered ? 1.4 : 1;
        const haloScale = isSelected ? 4.4 : isHovered ? 3.1 : 2.2;
        const opacity = interactive ? (isSelected ? 1 : 0.9) : 0.5;
        const haloOpacity = isSelected ? 0.22 : isHovered ? 0.14 : 0.08;

        return (
          <group key={star.id} position={star.position}>
            <mesh
              scale={scale}
              onPointerOver={(event) => {
                if (!interactive) return;
                event.stopPropagation();
                setHoveredId(star.id);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHoveredId((current) => (current === star.id ? null : current));
                document.body.style.cursor = "default";
              }}
              onClick={(event) => {
                if (!interactive || !onSelectStar) return;
                event.stopPropagation();
                onSelectStar(star);
              }}
              userData={{ baseOpacity: opacity }}
            >
              <sphereGeometry args={[size, 18, 18]} />
              <meshBasicMaterial
                color={star.color ?? "#dbe7ff"}
                transparent
                opacity={opacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            <mesh rotation={[-Math.PI / 2, 0, 0]} userData={{ baseOpacity: haloOpacity }}>
              <ringGeometry args={[size * 1.8, size * haloScale, 32]} />
              <meshBasicMaterial
                color={star.color ?? "#dbe7ff"}
                transparent
                opacity={haloOpacity}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
