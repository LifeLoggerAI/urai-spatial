"use client";

import { useMemo, useRef, useState } from "react";
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
  glow: string;
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
    glow,
    emissiveIntensity,
    interactive,
    selected,
    mode,
    onSelectStar,
  } = props;

  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return;

    const t = clock.getElapsedTime();
    const pulse = interactive ? 1 + Math.sin(t * 1.7 + position[0]) * 0.07 : 1 + Math.sin(t * 0.7 + position[1]) * 0.015;
    const hoverBoost = hovered ? 1.1 : 1;
    const selectedBoost = selected ? 1.3 : 1;
    const sceneBoost = mode === "lifemap" || mode === "focusStar" || mode === "replay" ? 1 : 0.15;
    const scale = baseScale * pulse * hoverBoost * selectedBoost * sceneBoost;

    groupRef.current.scale.setScalar(scale);

    const parallax = THREE.MathUtils.clamp((camera.position.z + 20) / 90, -1, 1);
    groupRef.current.position.x = position[0] + position[2] * 0.004 * parallax;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.12 + position[0]) * 0.03;
    groupRef.current.position.z = position[2];
  });

  const visible = mode === "lifemap" || mode === "focusStar" || mode === "replay";

  return (
    <group
      ref={groupRef}
      visible={visible}
      onPointerOver={(e) => {
        if (!interactive || mode !== "lifemap") return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        if (!interactive || mode !== "lifemap") return;
        e.stopPropagation();
        onSelectStar(id);
      }}
    >
      <mesh>
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial
          color={selected ? "#fff1c4" : color}
          transparent
          opacity={selected ? 1 : interactive ? 0.95 : 0.62}
        />
      </mesh>
      <mesh scale={[2.6, 2.6, 2.6]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color={selected ? "#ffd38d" : glow}
          transparent
          opacity={selected ? 0.14 : interactive ? 0.09 : 0.025}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        distance={interactive ? 6 : 1.8}
        intensity={selected ? 1.1 : interactive ? emissiveIntensity : 0}
        color={selected ? "#ffd38d" : glow}
      />
    </group>
  );
}

export default function Starfield(props: StarfieldProps) {
  const { mode, selectedStar, onSelectStar } = props;

  const grouped = useMemo(() => {
    return STAR_DATA.map((star) => {
      const baseScale =
        star.layer === "far" ? 0.03 : star.layer === "mid" ? 0.09 : 0.18;

      const color =
        star.interactive
          ? star.layer === "near"
            ? "#edf5ff"
            : "#dceaff"
          : star.layer === "far"
            ? "#5f7298"
            : "#90a6c8";

      const glow =
        star.interactive
          ? star.layer === "near"
            ? "#9dc7ff"
            : "#7aa9ff"
          : "#5f7fb6";

      const emissiveIntensity =
        star.layer === "near" ? 0.42 : star.layer === "mid" ? 0.24 : 0.08;

      return {
        ...star,
        baseScale,
        color,
        glow,
        emissiveIntensity,
      };
    });
  }, []);

  return (
    <group>
      {grouped.map((star) => (
        <StarMesh
          key={star.id}
          id={star.id}
          position={star.position}
          baseScale={star.baseScale}
          color={star.color}
          glow={star.glow}
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
