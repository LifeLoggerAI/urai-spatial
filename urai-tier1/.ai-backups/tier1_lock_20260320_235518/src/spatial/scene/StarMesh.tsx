"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Color } from "three";
import type { SceneMode } from "../types";

export type StarMeshProps = {
  id: string;
  position: [number, number, number];
  baseScale: number;
  color: string;
  emissiveIntensity: number;
  interactive: boolean;
  selected: boolean;
  hovered: boolean;
  mode: SceneMode;
  onSelectStar: (id: string) => void;
  onHoverStar: (id: string | null) => void;
};

export default function StarMesh({
  id,
  position,
  baseScale,
  color,
  emissiveIntensity,
  interactive,
  selected,
  hovered,
  mode,
  onSelectStar,
  onHoverStar,
}: StarMeshProps) {
  const ref = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const emissive = useMemo(() => new Color(color), [color]);

  useFrame((state, delta) => {
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.9 + position[2]) * 0.08;
    const targetScale =
      baseScale *
      pulse *
      (selected ? 1.75 : hovered ? 1.32 : 1) *
      (mode === "replay" && selected ? 1.24 : 1);

    if (ref.current) {
      const s = ref.current.scale.x + (targetScale - ref.current.scale.x) * (1 - Math.exp(-delta * 8));
      ref.current.scale.setScalar(s);
    }

    if (haloRef.current) {
      const haloScale = targetScale * (selected ? 7.2 : hovered ? 5.8 : 4.4);
      const s = haloRef.current.scale.x + (haloScale - haloRef.current.scale.x) * (1 - Math.exp(-delta * 6));
      haloRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef} renderOrder={1}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.18 : hovered ? 0.13 : 0.08}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={ref}
        renderOrder={3}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (interactive) onHoverStar(id);
        }}
        onPointerOut={() => onHoverStar(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) onSelectStar(id);
        }}
      >
        <sphereGeometry args={[1, 22, 22]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * (selected ? 2.2 : hovered ? 1.45 : 1)}
          roughness={0.08}
          metalness={0.12}
          toneMapped
        />
      </mesh>
    </group>
  );
}
