"use client";

import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export type UraiSymbol3DProduct =
  | "uraiCore"
  | "uraiLabs"
  | "uraiFoundation"
  | "uraiStudio"
  | "assetFactory"
  | "uraiAnalytics"
  | "uraiContent"
  | "uraiCommunications"
  | "uraiMarketing"
  | "uraiJobs"
  | "uraiPrivacy"
  | "uraiInvestors"
  | "uraiSpatial";

type UraiSymbol3DPhase = "home" | "lifemap" | "focus" | "replay" | "idle";

type Props = {
  product?: UraiSymbol3DProduct;
  phase?: UraiSymbol3DPhase;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  opacity?: number;
};

const PRODUCT_ACCENTS: Record<UraiSymbol3DProduct, string> = {
  uraiCore: "#4F7CFF",
  uraiLabs: "#7A5CFF",
  uraiFoundation: "#2ED3B7",
  uraiStudio: "#B56CFF",
  assetFactory: "#5DDCFF",
  uraiAnalytics: "#4F7CFF",
  uraiContent: "#F5B942",
  uraiCommunications: "#2ED3B7",
  uraiMarketing: "#FF5E8A",
  uraiJobs: "#74FFB3",
  uraiPrivacy: "#8AA0FF",
  uraiInvestors: "#F5B942",
  uraiSpatial: "#7A5CFF",
};

function productModifier(product: UraiSymbol3DProduct, accent: THREE.Color, opacity: number) {
  const material = (
    <meshBasicMaterial
      color={accent}
      transparent
      opacity={opacity}
      depthWrite={false}
      toneMapped={false}
    />
  );

  switch (product) {
    case "uraiLabs":
      return (
        <group rotation={[0, 0, Math.PI / 4]}>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[1.16, 0.035, 0.012]} />
            {material}
          </mesh>
          <mesh position={[0.08, -0.08, 0.012]}>
            <boxGeometry args={[0.86, 0.018, 0.01]} />
            {material}
          </mesh>
        </group>
      );

    case "uraiFoundation":
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.001, 4, 4]} />
            {material}
          </mesh>
          <mesh>
            <sphereGeometry args={[0.001, 4, 4]} />
            {material}
          </mesh>
        </group>
      );

    case "uraiSpatial":
      return (
        <group rotation={[Math.PI / 2.35, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.001, 4, 4]} />
            {material}
          </mesh>
          <mesh>
            <sphereGeometry args={[0.001, 4, 4]} />
            {material}
          </mesh>
        </group>
      );

    case "uraiPrivacy":
      return (
        <group>
          <mesh position={[0, -0.04, 0.01]}>
            <boxGeometry args={[0.7, 0.9, 0.012]} />
            <meshBasicMaterial
              color={accent}
              transparent
              opacity={opacity * 0.16}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.001, 4, 4]} />
            {material}
          </mesh>
        </group>
      );

    case "uraiMarketing":
      return (
        <group>
          {[0.52, 0.68, 0.84].map((r) => (
            <mesh key={r} rotation={[0, 0, -0.35]}>
              <sphereGeometry args={[0.001, 4, 4]} />
              {material}
            </mesh>
          ))}
        </group>
      );

    default:
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.001, 4, 4]} />
            {material}
          </mesh>
        </group>
      );
  }
}

export function UraiSymbol3D({
  product = "uraiCore",
  phase = "idle",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  opacity = 0.72,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const accent = useMemo(() => new THREE.Color(PRODUCT_ACCENTS[product]), [product]);

  useFrame((state, delta) => {
    if (!group.current) return;

    const t = state.clock.getElapsedTime();
    const phaseStrength =
      phase === "home" ? 0.018 :
      phase === "lifemap" ? 0.028 :
      phase === "focus" ? 0.04 :
      phase === "replay" ? 0.024 :
      0.018;

    const breath = 1 + Math.sin(t * 0.85) * phaseStrength;
    group.current.scale.setScalar(scale * breath);
    group.current.rotation.z += delta * (phase === "lifemap" ? 0.09 : 0.045);
  });

  return (
    <group ref={group} position={position} rotation={rotation} renderOrder={20}>
      <mesh>
        <sphereGeometry args={[0.001, 4, 4]} />
        <meshBasicMaterial
          color="#DDE7FF"
          transparent
          opacity={opacity * 0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          transparent
          opacity={opacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={[1.18, 1.18, 1.18]}>
        <sphereGeometry args={[0.001, 4, 4]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={opacity * 0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {productModifier(product, accent, opacity * 0.68)}
    </group>
  );
}

export default UraiSymbol3D;
