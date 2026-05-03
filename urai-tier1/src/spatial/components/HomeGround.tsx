"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";

type EmotionalStateLike = {
  tone?: string;
  symbolicWeight?: string;
  auraColor?: string;
  intensity?: number;
};

export type HomeGroundProps = {
  phase?: string;
  ascentProgress?: number;
  emotionalState?: EmotionalStateLike | null;
  auraColor?: string;
  intensity?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

function weightFactor(weight?: string) {
  if (weight === "heavy" || weight === "threshold") return 1;
  if (weight === "medium") return 0.55;
  return 0.25;
}

function toneFactor(tone?: string) {
  if (tone === "grief") return { breath: 0.22, fog: 0.8, lift: -0.08 };
  if (tone === "tension") return { breath: 0.34, fog: 0.55, lift: -0.03 };
  if (tone === "awe") return { breath: 0.28, fog: 0.35, lift: 0.08 };
  if (tone === "recovery") return { breath: 0.2, fog: 0.3, lift: 0.06 };
  return { breath: 0.18, fog: 0.42, lift: 0 };
}

export default function HomeGround({
  phase = "HOME",
  ascentProgress = 0,
  emotionalState = null,
  auraColor,
  intensity,
}: HomeGroundProps) {
  const root = useRef<THREE.Group>(null);
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const fogMat = useRef<THREE.MeshBasicMaterial>(null);

  const ascent = clamp01(ascentProgress);
  const tone = emotionalState?.tone ?? "calm";
  const symbolicWeight = emotionalState?.symbolicWeight ?? "light";
  const resolvedAura = emotionalState?.auraColor ?? auraColor ?? "#8f8cff";
  const resolvedIntensity = clamp01(emotionalState?.intensity ?? intensity ?? 0.42);
  const tf = toneFactor(tone);
  const wf = weightFactor(symbolicWeight);

  const aura = useMemo(() => new THREE.Color(resolvedAura), [resolvedAura]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breath = 0.5 + 0.5 * Math.sin(t * (0.18 + tf.breath));
    const ascentFade = 1 - ascent * 0.72;
    const live = 0.035 + breath * 0.035 * resolvedIntensity;

    if (root.current) {
      root.current.position.y = -1.95 - ascent * 9.5;
      root.current.position.z = -0.45 - ascent * 12.0;
      root.current.scale.setScalar(1 + ascent * 0.38);
    }

    if (groundMat.current) {
      const base = new THREE.Color("#05060d");
      const infuse = aura.clone().multiplyScalar(0.09 + resolvedIntensity * 0.08 + tf.lift * 0.08);
      groundMat.current.color.copy(base.add(infuse));
      groundMat.current.emissive.copy(aura).multiplyScalar((0.018 + live) * ascentFade);
      groundMat.current.opacity = 0.96 * ascentFade;
      groundMat.current.roughness = 0.94;
      groundMat.current.metalness = 0.0;
    }

    if (shadowMat.current) {
      shadowMat.current.opacity = (0.44 + wf * 0.18) * ascentFade;
    }

    if (fogMat.current) {
      fogMat.current.color.copy(aura).lerp(new THREE.Color("#060812"), 0.78);
      fogMat.current.opacity = (0.08 + tf.fog * 0.07 + wf * 0.04) * ascentFade;
    }
  });

  const visible = phase === "HOME" || phase === "ASCENT" || phase === "LIFEMAP";

  return (
    <group ref={root} visible={visible} renderOrder={-20}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -5.5]} receiveShadow>
        <sphereGeometry args={[42, 128, 32, 0, Math.PI * 2, 0, Math.PI * 0.22]} />
        <meshStandardMaterial
          ref={groundMat}
          transparent
          depthWrite
          color="#05060d"
          emissive="#151229"
          emissiveIntensity={0.06}
          roughness={0.94}
          metalness={0}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0.15]} renderOrder={-10}>
        <circleGeometry args={[4.35, 96]} />
        <meshBasicMaterial
          ref={shadowMat}
          transparent
          depthWrite={false}
          color="#000000"
          opacity={0.48}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, -12]} renderOrder={-9}>
        <ringGeometry args={[10, 38, 160]} />
        <meshBasicMaterial
          ref={fogMat}
          transparent
          depthWrite={false}
          color="#090b18"
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
