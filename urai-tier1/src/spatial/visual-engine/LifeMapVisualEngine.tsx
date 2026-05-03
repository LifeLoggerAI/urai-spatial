"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type LifeMapVisualEngineProps = {
  visible: boolean;
};

function seeded(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function LifeMapVisualEngine({ visible }: LifeMapVisualEngineProps) {
  const rootRef = useRef<THREE.Group>(null);
  const farRef = useRef<THREE.Points>(null);
  const midRef = useRef<THREE.Points>(null);
  const nearRef = useRef<THREE.Points>(null);
  const nebulaARef = useRef<THREE.Mesh>(null);
  const nebulaBRef = useRef<THREE.Mesh>(null);
  const depthFogRef = useRef<THREE.Mesh>(null);

  const farStars = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 520; i++) {
      const a = seeded(i + 1) * Math.PI * 2;
      const r = 22 + seeded(i + 2) * 34;
      const y = -7 + seeded(i + 3) * 22;
      const z = -34 - seeded(i + 4) * 44;
      arr.push(Math.cos(a) * r, y, z + Math.sin(a) * r * 0.18);
    }
    return new Float32Array(arr);
  }, []);

  const midStars = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 280; i++) {
      const a = seeded(i + 800) * Math.PI * 2;
      const r = 12 + seeded(i + 801) * 24;
      const y = -4 + seeded(i + 802) * 15;
      const z = -18 - seeded(i + 803) * 28;
      arr.push(Math.cos(a) * r, y, z + Math.sin(a) * r * 0.16);
    }
    return new Float32Array(arr);
  }, []);

  const nearStars = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 110; i++) {
      const a = seeded(i + 1400) * Math.PI * 2;
      const r = 7 + seeded(i + 1401) * 16;
      const y = -2 + seeded(i + 1402) * 10;
      const z = -8 - seeded(i + 1403) * 18;
      arr.push(Math.cos(a) * r, y, z + Math.sin(a) * r * 0.12);
    }
    return new Float32Array(arr);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const presence = visible ? 1 : 0;

    if (rootRef.current) rootRef.current.visible = presence > 0.001;

    if (farRef.current) {
      farRef.current.rotation.y = Math.sin(t * 0.018) * 0.012;
      farRef.current.rotation.x = Math.cos(t * 0.014) * 0.006;
      (farRef.current.material as THREE.PointsMaterial).opacity = 0.34 * presence;
    }

    if (midRef.current) {
      midRef.current.rotation.y = Math.sin(t * 0.026) * 0.018;
      midRef.current.rotation.x = Math.cos(t * 0.019) * 0.008;
      (midRef.current.material as THREE.PointsMaterial).opacity = 0.48 * presence;
    }

    if (nearRef.current) {
      nearRef.current.rotation.y = Math.sin(t * 0.034) * 0.026;
      nearRef.current.rotation.x = Math.cos(t * 0.025) * 0.011;
      (nearRef.current.material as THREE.PointsMaterial).opacity = 0.62 * presence;
    }

    if (nebulaARef.current) {
      nebulaARef.current.rotation.z = Math.sin(t * 0.022) * 0.03;
      (nebulaARef.current.material as THREE.MeshBasicMaterial).opacity = 0.115 * presence;
    }

    if (nebulaBRef.current) {
      nebulaBRef.current.rotation.z = Math.cos(t * 0.018) * 0.025;
      (nebulaBRef.current.material as THREE.MeshBasicMaterial).opacity = 0.085 * presence;
    }

    if (depthFogRef.current) {
      (depthFogRef.current.material as THREE.MeshBasicMaterial).opacity =
        (0.12 + Math.sin(t * 0.05) * 0.018) * presence;
    }
  });

  if (!visible) return null;

  return (
    <group ref={rootRef} name="URAI_LIFEMAP_DEPTH_POLISH_LOCK">
      <mesh ref={nebulaARef} position={[-12, 8, -42]} rotation={[0.18, 0.28, -0.16]} scale={[28, 11, 1]}>
        <planeGeometry args={[1, 1, 32, 8]} />
        <meshBasicMaterial color={new THREE.Color("#27105a")} transparent opacity={0.115} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={nebulaBRef} position={[15, 10, -54]} rotation={[-0.12, -0.34, 0.22]} scale={[36, 13, 1]}>
        <planeGeometry args={[1, 1, 32, 8]} />
        <meshBasicMaterial color={new THREE.Color("#123267")} transparent opacity={0.085} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={depthFogRef} position={[0, 4.8, -31]} scale={[54, 20, 1]}>
        <circleGeometry args={[1, 160]} />
        <meshBasicMaterial color={new THREE.Color("#0a1230")} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <points ref={farRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[farStars, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.026} color={new THREE.Color("#8fa5ff")} transparent opacity={0.34} depthWrite={false} />
      </points>

      <points ref={midRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[midStars, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.042} color={new THREE.Color("#b8a8ff")} transparent opacity={0.48} depthWrite={false} />
      </points>

      <points ref={nearRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nearStars, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.058} color={new THREE.Color("#e0d8ff")} transparent opacity={0.62} depthWrite={false} />
      </points>
    </group>
  );
}
