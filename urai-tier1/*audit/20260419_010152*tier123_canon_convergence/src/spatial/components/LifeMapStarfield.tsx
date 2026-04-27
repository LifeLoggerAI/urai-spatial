"use client";

import { resolveRenderableStars } from "@/spatial/lib/renderGuards";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

export type LifeMapStar = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
};

type LifeMapStarfieldProps = {
  visible: boolean;
  stars: LifeMapStar[];
  selectedStarId: string | null;
  onSelectStar?: (id: string) => void;
  interactive?: boolean;
  opacity?: number;
  ascentOffset?: number;
};

function BackgroundDust() {
  const groupRef = useRef<THREE.Group>(null);

  const dust = useMemo(() => {
    const points: Array<{ position: [number, number, number]; size: number; opacity: number }> = [];
    for (let i = 0; i < 420; i += 1) {
      points.push({
        position: [
          THREE.MathUtils.randFloatSpread(58),
          THREE.MathUtils.randFloatSpread(34),
          THREE.MathUtils.randFloat(-52, -6),
        ],
        size: THREE.MathUtils.randFloat(0.012, 0.05),
        opacity: THREE.MathUtils.randFloat(0.12, 0.58),
      });
    }
    return points;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.01;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.18) * 0.12;
  });

  return (
    <group ref={groupRef}>
      {dust.map((p, idx) => (
        <mesh key={idx} position={p.position}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial color="#d7ecff" transparent opacity={p.opacity} />
        </mesh>
      ))}
    </group>
  );
}

export default function LifeMapStarfield({
  opacity = 1,
  ascentOffset = 0,
  visible,
  stars,
  selectedStarId,
  onSelectStar,
  interactive = false,
}: LifeMapStarfieldProps) {
  const fieldRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (!fieldRef.current) return;
    fieldRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.16) * 0.10 + ascentOffset * 2;
    fieldRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.025;
  });

  if (!visible) return null;

  return (
    <group ref={fieldRef}>
      <ambientLight intensity={0.32} color="#7ca4d6" />
      <pointLight intensity={0.55} color="#5e88d8" position={[0, 0, -12]} distance={35} />
      <BackgroundDust />

      {resolveRenderableStars(stars as any)
        .filter((star) => Number.isFinite(Number(star.size)) && Number(star.size) > 0)
        .map((star, index) => {
          const selected = star.id === selectedStarId;
          const rawSize = typeof star.size === "number" ? star.size : Number(star.size);
          const safeSize = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 0.2;
          const baseSize = safeSize;
          const coreRadius = Math.max(0.001, selected ? baseSize * 1.5 : baseSize);
          const haloRadius = Math.max(0.001, selected ? baseSize * 2.8 : baseSize * 2.2);
          const depth = Math.max(0, Math.min(1, (-star.position[2] - 16) / 14));
          const depthScale = 0.72 + depth * 0.42;
          const depthOpacity = 0.28 + depth * 0.72;
          const adjustedCoreRadius = coreRadius * depthScale;
          const adjustedHaloRadius = haloRadius * (0.78 + depth * 0.34);
          const twinkleSeed = index * 0.73 + star.position[0] * 0.11 + star.position[1] * 0.07;

          const parallax = 0.025;
          const position: [number, number, number] = [
            star.position[0] - camera.position.x * parallax,
            star.position[1] - camera.position.y * parallax,
            star.position[2],
          ];

          return (
            <TwinklingStar
              key={star.id}
              star={{ ...(star as LifeMapStar), position }}
              selected={selected}
              adjustedCoreRadius={adjustedCoreRadius}
              adjustedHaloRadius={adjustedHaloRadius}
              depthOpacity={depthOpacity}
              opacity={opacity}
              interactive={interactive}
              twinkleSeed={twinkleSeed}
              onSelectStar={onSelectStar}
            />
          );
        })}
    </group>
  );
}

function TwinklingStar({
  star,
  selected,
  adjustedCoreRadius,
  adjustedHaloRadius,
  depthOpacity,
  opacity,
  interactive,
  twinkleSeed,
  onSelectStar,
}: {
  star: LifeMapStar;
  selected: boolean;
  adjustedCoreRadius: number;
  adjustedHaloRadius: number;
  depthOpacity: number;
  opacity: number;
  interactive: boolean;
  twinkleSeed: number;
  onSelectStar?: (id: string) => void;
}) {
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker =
      0.965 +
      Math.sin(t * 1.8 + twinkleSeed) * 0.025 +
      Math.sin(t * 3.7 + twinkleSeed * 1.7) * 0.012;

    if (coreMatRef.current) {
      coreMatRef.current.emissiveIntensity =
        ((selected ? 1.15 : 0.55) * Math.max(0.15, opacity)) * depthOpacity * flicker;
    }

    if (haloMatRef.current) {
      haloMatRef.current.opacity =
        ((selected ? 0.18 : 0.08) * opacity) *
        depthOpacity *
        (0.98 + Math.sin(t * 1.4 + twinkleSeed) * 0.02);
    }
  });

  const handleClick = (e: any) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelectStar?.(star.id);
  };

  return (
    <group key={star.id} position={star.position}>
      <mesh onClick={handleClick} userData={{ interactive, starId: star.id }}>
        <sphereGeometry args={[adjustedCoreRadius, 32, 32]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color={star.color}
          emissive={star.color}
          emissiveIntensity={((selected ? 1.15 : 0.55) * Math.max(0.15, opacity)) * depthOpacity}
          roughness={0.22}
          metalness={0.02}
        />
      </mesh>

      <mesh onClick={handleClick} userData={{ interactive, starId: star.id, halo: true }}>
        <sphereGeometry args={[adjustedHaloRadius, 24, 24]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color={star.color}
          transparent
          opacity={((selected ? 0.18 : 0.08) * opacity) * depthOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
