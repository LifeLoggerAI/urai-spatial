"use client";

import { Mesh } from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";

export type StarMeshProps = {
  id: string;
  position: [number, number, number];
  scale?: number;
  baseScale?: number;
  color?: string;
  glow?: number;
  emissiveIntensity?: number;
  interactive?: boolean;
  selected?: boolean;
  hovered?: boolean;
  dimmed?: boolean;
  mode?: string;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  onSelectStar?: (id: string) => void;
};

export default function StarMesh({
  id,
  position,
  scale = 1,
  baseScale = 1,
  color = "#f6f1ff",
  glow = 1,
  emissiveIntensity,
  interactive = true,
  selected = false,
  hovered: hoveredProp = false,
  dimmed = false,
  onHover,
  onClick,
  onSelectStar,
}: StarMeshProps) {
  const ref = useRef<Mesh>(null);
  const [localHovered, setLocalHovered] = useState(false);

  useEffect(() => {
    setLocalHovered(hoveredProp);
  }, [hoveredProp]);

  const hovered = localHovered || hoveredProp;
  useCursor(Boolean(interactive && hovered));

  const targetScale = useMemo(() => {
    const hoverBoost = hovered ? 1.14 : 1;
    const selectedBoost = selected ? 1.4 : 1;
    const dimScale = dimmed ? 0.92 : 1;
    return Math.max(0.001, baseScale * scale * hoverBoost * selectedBoost * dimScale);
  }, [baseScale, scale, hovered, selected, dimmed]);

  useFrame((_, dt) => {
    if (!ref.current) return;

    const current = ref.current.scale.x;
    const next = current + (targetScale - current) * Math.min(1, dt * 8);
    ref.current.scale.setScalar(next);

    const z = ref.current.position.z;
    const depthFade = Math.max(0.35, Math.min(1.2, 1.18 - Math.abs(z) * 0.03));
    const pulse = selected ? 0.18 * Math.sin(performance.now() * 0.004) : 0;
    const material = ref.current.material as {
      emissiveIntensity?: number;
      opacity?: number;
    };

    const baseGlow = emissiveIntensity ?? glow;
    if (material) {
      material.emissiveIntensity =
        baseGlow * depthFade +
        (hovered ? 0.55 : 0) +
        (selected ? 1.15 : 0) +
        pulse -
        (dimmed ? 0.25 : 0);

      material.opacity = dimmed ? 0.42 : selected ? 1 : hovered ? 0.98 : 0.9;
    }
  });

  return (
    <mesh
      ref={ref}
      position={position}
      scale={[baseScale * scale, baseScale * scale, baseScale * scale]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!interactive) return;
        setLocalHovered(true);
        onHover?.(id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setLocalHovered(false);
        onHover?.(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!interactive) return;
        onClick?.(id);
        onSelectStar?.(id);
      }}
    >
      <sphereGeometry args={[0.08, 20, 20]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity ?? glow}
        transparent
        opacity={dimmed ? 0.42 : 0.9}
        roughness={0.18}
        metalness={0.04}
        toneMapped={false}
      />
    </mesh>
  );
}
