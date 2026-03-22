"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Color } from "three";
import { useSceneStore } from "../state/sceneStore";
import { resolveStarById } from "../data/stars";

export default function ReplaySphere() {
  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const ref = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  const star = resolveStarById(selectedStar);
  const color = useMemo(() => new Color(star?.color ?? "#dfeaff"), [star?.color]);

  useFrame((state) => {
    if (!ref.current || !haloRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 0.8) * 0.04;
    ref.current.scale.setScalar(pulse);
    haloRef.current.scale.setScalar(1.8 + Math.sin(t * 0.6) * 0.08);
  });

  if (mode !== "replay" || !star) return null;

  return (
    <group position={[star.position[0] * 0.02, star.position[1] + 0.03, star.position[2] - 0.55]}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <mesh ref={ref}>
        <sphereGeometry args={[0.92, 48, 48]} />
        <meshPhysicalMaterial
          color="#f8fbff"
          emissive={color}
          emissiveIntensity={0.75}
          transmission={0.35}
          transparent
          opacity={0.94}
          roughness={0.08}
          metalness={0.05}
          thickness={1.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          ior={1.14}
        />
      </mesh>

      <mesh position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.88, 1.52, 48]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.16} />
      </mesh>
    </group>
  );
}
