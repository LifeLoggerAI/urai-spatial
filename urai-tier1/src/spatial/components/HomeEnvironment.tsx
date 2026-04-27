"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type HomeEnvironmentProps = {
  visible: boolean;
  interactive?: boolean;
  phase: "HOME" | "ASCENT";
  dim?: number;
  onSkySelect?: () => void;
  onGroundSelect?: () => void;
  onOrbSelect?: () => void;
};

type StarTier = {
  id: string;
  position: [number, number, number];
  scale: number;
  opacity: 1};

function buildTier(
  prefix: string,
  count: number,
  spreadX: number,
  spreadY: number,
  zMin: number,
  zMax: number,
  scaleMin: number,
  scaleMax: number,
  opacityMin: number,
  opacityMax: number,
  seed: number,
): StarTier[] {
  let s = seed >> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >> 0;
    return s / 4294967296;
  };

  const out: StarTier[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      id: `${prefix}-${i}`,
      position: [
        (rand() * 2 - 1) * spreadX,
        0.8 + rand() * spreadY,
        zMin + rand() * (zMax - zMin),
      ],
      scale: scaleMin + rand() * (scaleMax - scaleMin),
      opacity: 1,
    });
  }
  return out;
}

function StarTierField({
  stars,
  drift,
  tint,
}: {
  stars: StarTier[];
  drift: number;
  tint: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.x = Math.sin(t * drift) * 0.08;
    groupRef.current.position.y = Math.cos(t * drift * 0.8) * 0.05;
  });

  if (phase !== "HOME") return null;

return (
    <group ref={groupRef}>
      {stars.map((star) => (
        <mesh key={star.id} position={star.position}>
          <sphereGeometry args={[star.scale, 8, 8]} />
          <meshBasicMaterial color={tint} transparent opacity={star.opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function HomeEnvironment({
  visible,
  interactive = false,
  phase,
  dim = 0,
  onSkySelect,
  onGroundSelect,
  onOrbSelect,
}: HomeEnvironmentProps) {
  const orbRef = useRef<THREE.Group>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const nearStars = useMemo(
    () => buildTier("near", 34, 14, 9.5, -16, -9.5, 0.028, 0.058, 0.20, 0.40, 781),
    [],
  );
  const midStars = useMemo(
    () => buildTier("mid", 52, 18, 12, -28, -17, 0.020, 0.042, 0.14, 0.28, 991),
    [],
  );
  const farStars = useMemo(
    () => buildTier("far", 70, 22, 14, -42, -29, 0.014, 0.026, 0.08, 0.18, 1231),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (orbRef.current) {
      orbRef.current.scale.set(pulse, pulse, pulse);

      orbRef.current.position.x += driftX;
      orbRef.current.position.z += driftZ;

      orbRef.current.position.y = 2.9 + Math.sin(t * 0.55) * 0.05;
      orbRef.current.rotation.y += delta * 0.12;
    }
    if (ringARef.current) ringARef.current.rotation.z += delta * 0.16;
    if (ringBRef.current) ringBRef.current.rotation.z -= delta * 0.11;
  });

  const orbOpacity = THREE.MathUtils.clamp(1 - dim * 0.42, 0.48, 1);
  const ringOpacity = THREE.MathUtils.clamp(0.32 - dim * 0.14, 0.10, 0.32);
  const haloOpacity = THREE.MathUtils.clamp(0.12 - dim * 0.05, 0.05, 0.14);
  const groundOpacity = THREE.MathUtils.clamp(0.16 - dim * 0.05, 0.08, 0.16);
  const glowOpacity = THREE.MathUtils.clamp(0.05 - dim * 0.018, 0.018, 0.06);

  return (
    <group visible={visible}>
      <StarTierField stars={farStars} drift={0.05} tint="#94a5c8" />
      <StarTierField stars={midStars} drift={0.08} tint="#a9b8d8" />
      <StarTierField stars={nearStars} drift={0.12} tint="#d5e6ff" />

      <mesh position={[0, 0.9, -18]}>
        <sphereGeometry args={[28, 32, 32]} />
        <meshBasicMaterial color="#031126" transparent opacity={0.92} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <mesh
        position={[0, 3.8, -20]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={interactive ? onSkySelect : undefined}
      >
        <circleGeometry args={[24, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh
        position={[0, -1.82, -5.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={interactive ? onGroundSelect : undefined}
      >
        <circleGeometry args={[11.4, 96]} />
        <meshBasicMaterial color="#08131f" transparent opacity={groundOpacity} depthWrite={false} />
      </mesh>

      <mesh position={[0, -1.81, -5.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6.4, 80]} />
        <meshBasicMaterial color="#0b2337" transparent opacity={0.92} depthWrite={false} />
      </mesh>

      <mesh position={[0, -1.80, -5.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 2.25, 72]} />
        <meshBasicMaterial color="#4b87c9" transparent opacity={0.92} depthWrite={false} />
      </mesh>

      <mesh position={[0, 1.68, -4.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.08, 64]} />
        <meshBasicMaterial color="#02060c" transparent opacity={0.92} depthWrite={false} />
      </mesh>

      <mesh position={[0, 1.69, -4.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.9, 64]} />
        <meshBasicMaterial color="#7fbfff" transparent opacity={glowOpacity} depthWrite={false} />
      </mesh>

      <group ref={orbRef} position={[0, 2.9, -4.2]}>
        <mesh onClick={interactive ? onOrbSelect : undefined}>
          <sphereGeometry args={[0.96, 56, 56]} />
          <meshStandardMaterial
            color="#dfe8f2"
            emissive="#9ecbff"
            emissiveIntensity={0.17}
            roughness={0.68}
            metalness={0.06}
            transparent
            opacity={orbOpacity}
          depthWrite={false} />
        </mesh>

        <mesh scale={[1.06, 1.06, 1.06]}>
          <sphereGeometry args={[0.98, 48, 48]} />
          <meshPhysicalMaterial
            color="#f1f7ff"
            roughness={0.18}
            metalness={0.0}
            transmission={0.0}
            clearcoat={0.65}
            clearcoatRoughness={0.38}
            transparent
            opacity={0.92}
          />
        </mesh>

        <mesh position={[0.16, 0.22, 0.58]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.92} depthWrite={false} />
        </mesh>

        <mesh scale={[1.78, 1.78, 1.78]}>
          <sphereGeometry args={[1.0, 40, 40]} />
          <meshBasicMaterial color="#a7c9ff" transparent opacity={haloOpacity} side={THREE.BackSide} depthWrite={false} />
        </mesh>

        <mesh ref={ringARef} rotation={[0.55, 0.18, 0.12]} scale={[1.55, 0.72, 1.0]}>
          <torusGeometry args={[1.32, 0.045, 14, 120]} />
          <meshBasicMaterial color="#83a9df" transparent opacity={ringOpacity} depthWrite={false} />
        </mesh>

        <mesh ref={ringBRef} rotation={[-0.92, 0.3, -0.42]} scale={[1.48, 0.58, 1.0]}>
          <torusGeometry args={[1.46, 0.038, 14, 120]} />
          <meshBasicMaterial color="#728fbd" transparent opacity={ringOpacity * 0.9} depthWrite={false} />
        </mesh>
      </group>

      {phase === "ASCENT" && (
        <mesh position={[0, 2.9, -4.2]} scale={[2.2, 2.2, 2.2]}>
          <sphereGeometry args={[1, 36, 36]} />
          <meshBasicMaterial color="#9bc7ff" transparent opacity={0.92} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
