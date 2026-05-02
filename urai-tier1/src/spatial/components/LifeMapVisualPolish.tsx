"use client";

import * as THREE from "three";
import { Sparkles, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { LIFE_MAP_VISUAL_ASSETS, preloadLifeMapVisualAssets } from "../assets/lifemapVisualAssets";

type LifeMapVisualPolishProps = {
  active?: boolean;
  intensity?: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function LifeMapVisualPolish({ active = true, intensity = 1 }: LifeMapVisualPolishProps) {
  const root = useRef<THREE.Group>(null);
  const nebulaTexture = useTexture(LIFE_MAP_VISUAL_ASSETS.nebulaVeil);
  const fogTexture = useTexture(LIFE_MAP_VISUAL_ASSETS.depthFog);

  useEffect(() => {
    preloadLifeMapVisualAssets();
  }, []);

  const alpha = clamp01(active ? intensity : 0);

  const nebulaMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      map: nebulaTexture,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    return mat;
  }, [nebulaTexture]);

  const fogMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      map: fogTexture,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    return mat;
  }, [fogTexture]);

  useFrame(({ clock }, dt) => {
    if (!root.current) return;

    const t = clock.elapsedTime;
    root.current.rotation.y += dt * 0.0018;
    root.current.position.x = Math.sin(t * 0.035) * 0.18;
    root.current.position.y = Math.sin(t * 0.027) * 0.11;

    nebulaMat.opacity = THREE.MathUtils.lerp(nebulaMat.opacity, 0.42 * alpha, clamp01(dt * 2.4));
    fogMat.opacity = THREE.MathUtils.lerp(fogMat.opacity, 0.24 * alpha, clamp01(dt * 2.4));
  });

  return (
    <group ref={root} visible={alpha > 0.01} renderOrder={-10}>
      <mesh position={[0, 7.25, -74]} scale={[92, 54, 1]}>
        <planeGeometry args={[1, 1, 16, 8]} />
        <primitive object={nebulaMat} attach="material" />
      </mesh>

      <mesh position={[0, 6.1, -48]} scale={[64, 34, 1]}>
        <planeGeometry args={[1, 1, 16, 8]} />
        <primitive object={fogMat} attach="material" />
      </mesh>

      <Sparkles
        count={active ? 280 : 0}
        scale={[54, 22, 92]}
        size={1.25}
        speed={0.13}
        opacity={0.38 * alpha}
        position={[0, 7.6, -52]}
      />

      <Sparkles
        count={active ? 90 : 0}
        scale={[24, 10, 28]}
        size={2.25}
        speed={0.08}
        opacity={0.46 * alpha}
        position={[0, 6.4, -31]}
      />
    </group>
  );
}

export default LifeMapVisualPolish;
