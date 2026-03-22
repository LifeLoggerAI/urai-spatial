"use client";

import { useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneMode } from "../store/useSceneStore";
import { STAR_DATA } from "./starData";

type StarfieldProps = {
  mode: SceneMode;
  selectedStar: string | null;
  onSelectStar: (id: string) => void;
};

type StarMeshProps = {
  id: string;
  position: [number, number, number];
  baseScale: number;
  color: string;
  emissiveIntensity: number;
  interactive: boolean;
  selected: boolean;
  mode: SceneMode;
  onSelectStar: (id: string) => void;
};

function StarMesh(props: StarMeshProps) {
  const {
    id,
    position,
    baseScale,
    color,
    emissiveIntensity,
    interactive,
    selected,
    mode,
    onSelectStar,
  } = props;

  const meshRef = useMemo(() => new THREE.Mesh(), []);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef) return;
    const t = clock.getElapsedTime();
    const pulse = interactive ? 1 + Math.sin(t * 2.2 + position[0]) * 0.06 : 1;
    const hoverBoost = hovered ? 1.1 : 1;
    const selectedBoost = selected ? 1.28 : 1;
    const sceneBoost = mode === "lifemap" || mode === "focusStar" || mode === "replay" ? 1 : 0.6;
    const scale = baseScale * pulse * hoverBoost * selectedBoost * sceneBoost;
    meshRef.scale.setScalar(scale);
  });

  return (
    <mesh
      ref={(node) => {
        if (node) {
          meshRef.position.copy(node.position);
        }
      }}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interactive && mode === "lifemap") {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive && mode === "lifemap") {
          onSelectStar(id);
        }
      }}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial
        color={selected ? "#ffe8a8" : color}
        transparent
        opacity={selected ? 1 : interactive ? 0.95 : 0.72}
      />
      <pointLight
        distance={interactive ? 3.8 : 1.2}
        intensity={selected ? 0.8 : interactive ? emissiveIntensity : 0}
        color={selected ? "#ffd98b" : color}
      />
    </mesh>
  );
}

export default function Starfield(props: StarfieldProps) {
  const { mode, selectedStar, onSelectStar } = props;

  const grouped = useMemo(() => {
    return STAR_DATA.map((star) => {
      const baseScale =
        star.layer === "far" ? 0.035 : star.layer === "mid" ? 0.085 : 0.18;

      const color =
        star.interactive
          ? star.layer === "near"
            ? "#d6ecff"
            : "#cde3ff"
          : star.layer === "far"
            ? "#8ea7c7"
            : "#a9c0da";

      const emissiveIntensity =
        star.layer === "near" ? 0.28 : star.layer === "mid" ? 0.18 : 0.08;

      return {
        ...star,
        baseScale,
        color,
        emissiveIntensity,
      };
    });
  }, []);

  return (
    <group visible={mode === "lifemap" || mode === "focusStar" || mode === "replay"}>
      {grouped.map((star) => (
        <StarMesh
          key={star.id}
          id={star.id}
          position={star.position}
          baseScale={star.baseScale}
          color={star.color}
          emissiveIntensity={star.emissiveIntensity}
          interactive={star.interactive}
          selected={selectedStar === star.id}
          mode={mode}
          onSelectStar={onSelectStar}
        />
      ))}
    </group>
  );
}
