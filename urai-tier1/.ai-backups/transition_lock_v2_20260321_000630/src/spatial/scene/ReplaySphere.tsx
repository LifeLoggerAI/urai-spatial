"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh } from "three";
import { useSceneStore } from "../state/sceneStore";
import { resolveStarById } from "../data/stars";

export default function ReplaySphere() {
  const mode = useSceneStore((s) => s.mode);
  const phase = useSceneStore((s) => s.phase);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const star = resolveStarById(selectedStar);
  const core = useRef<Mesh>(null);
  const shell = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const color = useMemo(() => new Color(star?.color ?? "#dce8ff"), [star?.color]);

  const visible = mode === "replay" || phase === "to-replay" || phase === "from-replay";
  if (!visible || !star) return null;

  return (
    <group position={[star.position[0] * 0.015, star.position[1] + 0.04, star.position[2] - 0.55]}>
      <mesh ref={shell}>
        <sphereGeometry args={[1.62, 42, 42]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.16} depthWrite={false} />
      </mesh>

      <mesh ref={core}>
        <sphereGeometry args={[0.94, 48, 48]} />
        <meshPhysicalMaterial
          color="#f8fbff"
          emissive={color}
          emissiveIntensity={0.85}
          transmission={0.34}
          transparent
          opacity={0.95}
          roughness={0.07}
          metalness={0.03}
          thickness={1.15}
          clearcoat={1}
          clearcoatRoughness={0.04}
          ior={1.14}
        />
      </mesh>

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
        <ringGeometry args={[0.9, 1.5, 46]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

useFrame((state, delta) => {
  void state;
  void delta;
});
