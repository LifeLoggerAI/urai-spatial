"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh } from "three";

type Props = {
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

export default function StarMesh({
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
}: Props) {
  const core = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const emissive = useMemo(() => new Color(color), [color]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.9 + position[2]) * 0.07;
    const targetCore = scale * pulse * (selected ? 1.9 : hovered ? 1.35 : 1);
    const targetHalo = scale * (selected ? 8.8 : hovered ? 6.1 : 4.8);
    const targetRing = scale * (selected ? 4.4 : hovered ? 2.4 : 1.0);

    if (core.current) {
      const s = core.current.scale.x + (targetCore - core.current.scale.x) * (1 - Math.exp(-delta * 10));
      core.current.scale.setScalar(s);
    }
    if (halo.current) {
      const s = halo.current.scale.x + (targetHalo - halo.current.scale.x) * (1 - Math.exp(-delta * 7));
      halo.current.scale.setScalar(s);
    }
    if (ring.current) {
      const s = ring.current.scale.x + (targetRing - ring.current.scale.x) * (1 - Math.exp(-delta * 9));
      ring.current.scale.setScalar(s);
      ring.current.rotation.z += delta * 0.22;
    }
  });

  const opacity = dimmed ? 0.16 : selected ? 0.22 : hovered ? 0.16 : 0.09;
  const baseOpacity = dimmed ? 0.22 : 1;

  return (
    <group position={position}>
      <mesh ref={halo}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>

      <mesh
        ref={core}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (interactive) onHover(id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) onClick(id);
        }}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={(selected ? glow * 2.4 : hovered ? glow * 1.45 : glow) * baseOpacity}
          roughness={0.08}
          metalness={0.12}
          transparent
          opacity={baseOpacity}
        />
      </mesh>

      <mesh ref={ring} visible={selected || hovered} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.36, 40]} />
        <meshBasicMaterial color="#d9e7ff" transparent opacity={selected ? 0.22 : 0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}
