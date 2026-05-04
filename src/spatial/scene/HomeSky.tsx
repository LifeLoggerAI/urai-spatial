"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

import { useSceneStore } from "../state/sceneStore";

type StarPoint = {
  position: [number, number, number];
  size: number;
  opacity: number;
};

function createStars(count: number): StarPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const a = Math.sin((i + 1) * 92.31) * 43758.5453;
    const b = Math.sin((i + 1) * 39.17) * 12741.1947;
    const c = Math.sin((i + 1) * 17.73) * 31415.9265;
    const u = a - Math.floor(a);
    const v = b - Math.floor(b);
    const w = c - Math.floor(c);

    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = 30 + w * 18;

    return {
      position: [
        Math.sin(phi) * Math.cos(theta) * r,
        Math.abs(Math.cos(phi)) * r * 0.75 + 2,
        Math.sin(phi) * Math.sin(theta) * r,
      ],
      size: 0.015 + w * 0.04,
      opacity: 0.2 + u * 0.45,
    };
  });
}

export default function HomeSky() {
  const phase = useSceneStore((s) => s.phase);
  const mode = useSceneStore((s) => s.mode);
  const drifting = useRef<Group>(null);
  const dome = useRef<Mesh>(null);

  const stars = useMemo(() => createStars(140), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const homeAlpha = mode === "home" ? 1 : phase === "ASCENT" ? 0.45 : 0;

    if (dome.current) {
      const material = dome.current.material as { opacity: number };
      material.opacity = 0.22 * homeAlpha;
    }

    if (drifting.current) {
      drifting.current.position.x = Math.sin(t * 0.025) * 0.12;
      drifting.current.position.y = Math.cos(t * 0.02) * 0.08;
      drifting.current.rotation.y = t * 0.002;
    }
  });

  const homeAlpha = mode === "home" ? 1 : phase === "ASCENT" ? 0.45 : 0;

  return (
    <group renderOrder={-100} visible={homeAlpha > 0.001}>
      <mesh ref={dome} raycast={() => null} renderOrder={-110}>
        <sphereGeometry args={[72, 64, 64]} />
        <meshBasicMaterial
          side={1}
          transparent
          depthWrite={false}
          fog={false}
          color="#020617"
          opacity={0.22 * homeAlpha}
        />
      </mesh>

      <mesh position={[0, 14, -28]} rotation={[-Math.PI * 0.34, 0, 0]} raycast={() => null} renderOrder={-105}>
        <planeGeometry args={[120, 80]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.08 * homeAlpha} depthWrite={false} />
      </mesh>
      <mesh position={[0, 8, -22]} rotation={[-Math.PI * 0.26, 0, 0]} raycast={() => null} renderOrder={-104}>
        <planeGeometry args={[102, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.06 * homeAlpha} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3, -16]} rotation={[-Math.PI * 0.22, 0, 0]} raycast={() => null} renderOrder={-103}>
        <planeGeometry args={[86, 46]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.045 * homeAlpha} depthWrite={false} />
      </mesh>

      <group ref={drifting} renderOrder={-102}>
        {stars.map((star, idx) => (
          <mesh key={idx} position={star.position} raycast={() => null}>
            <sphereGeometry args={[star.size, 6, 6]} />
            <meshBasicMaterial color="#dbeafe" transparent opacity={star.opacity * 0.4 * homeAlpha} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
