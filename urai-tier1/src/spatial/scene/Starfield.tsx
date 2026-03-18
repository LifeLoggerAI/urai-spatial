"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "../state/sceneStore";
import type { SpatialStar } from "../data/stars";

function StarNode({
  star,
  selected,
  dimmed,
  mode,
  onSelect,
}: {
  star: SpatialStar;
  selected: boolean;
  dimmed: boolean;
  mode: "home" | "ascend" | "lifemap" | "focus" | "replay" | "pullback" | "descend_home";
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;

    const pulse = 1 + Math.sin(clock.getElapsedTime() * 1.2 + star.size * 8) * 0.08;
    const targetScale =
      mode === "replay" && selected
        ? 2.8 * pulse
        : selected
          ? 2.05 * pulse
          : dimmed
            ? 0.62 * pulse
            : 1.0 * pulse;

    mesh.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.12,
    );
  });

  const opacity =
    mode === "replay" && selected
      ? 1
      : selected
        ? 0.98
        : dimmed
          ? 0.18
          : 0.82;

  return (
    <mesh
      ref={ref}
      position={star.position as [number, number, number]}
      onClick={onSelect}
    >
      <sphereGeometry args={[star.size, 18, 18]} />
      <meshBasicMaterial color={star.color} transparent opacity={opacity} />
    </mesh>
  );
}

export default function Starfield() {
  const stars = useSceneStore((s) => s.stars);
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const selectStar = useSceneStore((s) => s.selectStar);

  const dimOthers = mode === "focus" || mode === "replay";

  return (
    <>
      {stars.map((star) => {
        const isSelected = selectedStar?.id === star.id;
        const dimmed = dimOthers && !isSelected;

        return (
          <StarNode
            key={star.id}
            star={star}
            selected={isSelected}
            dimmed={dimmed}
            mode={mode}
            onSelect={() => {
              if (mode === "lifemap" || mode === "focus") {
                selectStar(star);
              }
            }}
          />
        );
      })}
    </>
  );
}
