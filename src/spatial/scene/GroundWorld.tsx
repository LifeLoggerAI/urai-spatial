"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { MeshStandardMaterial } from "three";
import { useSceneStore } from "../state/sceneStore";

export default function GroundWorld() {
  const phase = useSceneStore((s) => s.phase);
  const shimmerMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useFrame((state) => {
    const mat = shimmerMaterialRef.current;
    if (!mat) return;

    if (phase === "HOME" && !reducedMotion) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.45);
      mat.opacity = 0.05 + pulse * 0.045;
      mat.emissiveIntensity = 0.05 + pulse * 0.12;
      return;
    }

    mat.opacity = 0.05;
    mat.emissiveIntensity = 0.05;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial color="#02040a" roughness={0.98} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, -0.45]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#03091a" roughness={1} metalness={0} transparent opacity={0.22} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.013, -0.4]} receiveShadow>
        <ringGeometry args={[3.7, 5.1, 64]} />
        <meshStandardMaterial
          color="#63b7ff"
          emissive="#4fa4f0"
          emissiveIntensity={0.08}
          roughness={0.66}
          metalness={0.06}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, -0.5]} receiveShadow>
        <ringGeometry args={[5.8, 7.5, 64]} />
        <meshStandardMaterial
          color="#355e95"
          emissive="#4f86c9"
          emissiveIntensity={0.06}
          roughness={0.82}
          metalness={0.03}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.016, -0.62]} receiveShadow>
        <ringGeometry args={[7.9, 9.6, 64]} />
        <meshStandardMaterial
          ref={shimmerMaterialRef}
          color="#1f3555"
          emissive="#6ec6ff"
          emissiveIntensity={0.05}
          roughness={0.88}
          metalness={0.01}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.52, 0.012, -0.05]} receiveShadow>
        <circleGeometry args={[1.1, 36]} />
        <shadowMaterial opacity={0.62} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial color="#67c4ff" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}
