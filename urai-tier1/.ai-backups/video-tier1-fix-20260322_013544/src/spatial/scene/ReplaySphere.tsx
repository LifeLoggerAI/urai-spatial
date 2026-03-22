"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh } from "three";
import { resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

export default function ReplaySphere() {
  const mode = useSceneStore((state) => state.mode);
  const phase = useSceneStore((state) => state.phase);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const star = resolveStarById(selectedStar);

  const core = useRef<Mesh>(null);
  const shell = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const color = useMemo(() => new Color(star?.color ?? "#dce8ff"), [star?.color]);

  useFrame((state, delta) => {
    if (!core.current || !shell.current || !ring.current) return;

    const t = state.clock.elapsedTime;
    const coreScale = 1 + Math.sin(t * 0.8) * 0.035;
    const shellScale = 1.75 + Math.sin(t * 0.48) * 0.06;

    core.current.scale.x += (coreScale - core.current.scale.x) * (1 - Math.exp(-delta * 7));
    core.current.scale.y = core.current.scale.x;
    core.current.scale.z = core.current.scale.x;

    shell.current.scale.x += (shellScale - shell.current.scale.x) * (1 - Math.exp(-delta * 5));
    shell.current.scale.y = shell.current.scale.x;
    shell.current.scale.z = shell.current.scale.x;

    ring.current.rotation.z += delta * 0.24;
  });

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
