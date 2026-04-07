"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SPATIAL_STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import type { SceneMode, SpatialStar } from "../types";

export type StarMeshProps = {
  id: string;
  position: [number, number, number];
  scale: number;
  color: string;
  glow: number;
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
};

export function depthScale(z: number, base: number) {
  const depth = THREE.MathUtils.clamp(Math.abs(z) / 10, 0.7, 2.4);
  return base * (0.9 + depth * 0.15);
}

function StarMesh({
  id,
  position,
  scale,
  color,
  glow,
  selected,
  hovered,
  interactive,
  dimmed,
  onHover,
  onClick,
}: StarMeshProps) {
  const camera = useThree((s) => s.camera);
  const worldPos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);
  const distance = camera.position.distanceTo(worldPos);
  const fade = THREE.MathUtils.clamp(1 - distance / 40, 0.35, 1);
  const activeBoost = selected ? 1.5 : hovered ? 1.25 : 1;
  const finalScale = scale * activeBoost;
  const opacity = dimmed ? 0.22 * fade : 0.92 * fade;

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interactive) onHover(id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        if (interactive) onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onClick(id);
      }}
    >
      <mesh>
        <sphereGeometry args={[finalScale, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh scale={2.8}>
        <sphereGeometry args={[finalScale, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.08 * glow} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Starfield() {
  const mode = useSceneStore((s) => s.mode);
  const hovered = useSceneStore((s) => s.hoveredStar);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const hoverStar = useSceneStore((s) => s.hoverStar);
  const selectStar = useSceneStore((s) => s.selectStar);
  const enterReplay = useSceneStore((s) => s.enterReplay);

  const interactive = mode === "lifemap" || mode === "replay";
  const onClick = (id: string) => {
    selectStar(id);
    if (mode === "replay") {
      enterReplay(id);
    }
  };

  return (
    <group visible={mode === "lifemap" || mode === "replay"}>
      {SPATIAL_STARS.map((star: SpatialStar) => {
        const isSelected = selectedStar === star.id;
        const isHovered = hovered === star.id;
        const dimmed = !!selectedStar && selectedStar !== star.id && mode === "replay";
        return (
          <StarMesh
            key={star.id}
            id={star.id}
            position={star.position}
            scale={depthScale(star.position[2], star.size)}
            color={star.color}
            glow={star.glow}
            selected={isSelected}
            hovered={isHovered}
            interactive={interactive}
            dimmed={dimmed}
            onHover={hoverStar}
            onClick={onClick}
          />
        );
      })}
    </group>
  );
}

export default Starfield;
