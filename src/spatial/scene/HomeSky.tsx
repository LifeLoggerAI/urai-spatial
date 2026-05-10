"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

import { useEnvironmentSignal } from "../signals/environmentSignal";

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);

    onChange();
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, []);

  return reducedMotion;
}

export default function HomeSky() {
  const env = useEnvironmentSignal();
  const reducedMotion = useReducedMotion();

  const skyRoot = useRef<Group>(null);
  const nebula = useRef<Mesh>(null);
  const moonRoot = useRef<Group>(null);
  const horizonMist = useRef<Mesh>(null);

  const stars = useMemo(
    () =>
      Array.from({ length: 260 }, (_, i) => ({
        key: `home-sky-star-${i}`,
        x: (Math.sin(i * 17.13) * 0.5 + 0.5) * 56 - 28,
        y: (Math.sin(i * 9.1 + 2.7) * 0.5 + 0.5) * 18 + 3.5,
        z: -30 - (Math.sin(i * 21.77) * 0.5 + 0.5) * 128,
        size: 0.008 + (Math.sin(i * 4.77 + 7.2) * 0.5 + 0.5) * 0.032,
        alpha: 0.08 + (Math.sin(i * 6.31 + 4.2) * 0.5 + 0.5) * 0.34,
        speed: 0.35 + (Math.sin(i * 3.33 + 1.1) * 0.5 + 0.5) * 0.85,
      })),
    []
  );

  const starMix = env.scene.starMix;
  const opacity = env.scene.skyOpacity;
  const nebulaOpacity = 0.07 + starMix * 0.055 + env.aliveness * 0.03;

  useFrame(({ clock }) => {
    if (!skyRoot.current || !nebula.current || !moonRoot.current || !horizonMist.current) return;

    if (!reducedMotion) {
      const t = clock.elapsedTime;

      skyRoot.current.rotation.y = Math.sin(t * env.motion.drift) * 0.035;
      skyRoot.current.rotation.x = Math.sin(t * env.motion.drift * 0.67) * 0.009;
      nebula.current.rotation.z = Math.sin(t * env.motion.drift * 1.35) * 0.06;
      moonRoot.current.position.y = 11.6 + Math.sin(t * 0.18) * 0.12;
      horizonMist.current.scale.x = 1 + Math.sin(t * 0.16) * 0.035;
    } else {
      skyRoot.current.rotation.set(0, 0, 0);
      nebula.current.rotation.set(0, 0, 0);
      moonRoot.current.position.y = 11.6;
      horizonMist.current.scale.x = 1;
    }
  });

  return (
    <group
      ref={skyRoot}
      visible={opacity > 0.001}
      userData={{ mood: env.mood, aliveness: env.aliveness }}
    >
      <mesh scale={[1, 0.62, 1]} position={[0, -4.5, -48]}>
        <sphereGeometry args={[84, 64, 48, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshBasicMaterial color={env.palette.sky} side={1} transparent opacity={0.98 * opacity} depthWrite={false} />
      </mesh>

      <mesh position={[0, 2.5, -58]} scale={[1.65, 0.42, 1]} renderOrder={-2}>
        <circleGeometry args={[24, 64]} />
        <meshBasicMaterial color="#335c96" transparent opacity={0.1 * opacity} depthWrite={false} />
      </mesh>

      <mesh ref={horizonMist} position={[-0.2, 1.18, -34]} scale={[1.9, 0.24, 1]} renderOrder={2}>
        <circleGeometry args={[9.5, 64]} />
        <meshBasicMaterial color="#9bdcff" transparent opacity={(0.12 + env.aliveness * 0.04) * opacity} depthWrite={false} />
      </mesh>

      <mesh ref={nebula} position={[0, 11.4, -56]} scale={[1.2, 0.72, 1]}>
        <circleGeometry args={[42, 64]} />
        <meshBasicMaterial color={env.palette.nebula} transparent opacity={nebulaOpacity * opacity} depthWrite={false} />
      </mesh>

      <group ref={moonRoot} position={[7.8, 11.6, -34]} rotation={[0, 0, -0.08]}>
        <mesh renderOrder={5}>
          <circleGeometry args={[0.84, 56]} />
          <meshBasicMaterial color="#f5fbff" transparent opacity={0.72 * opacity} depthWrite={false} />
        </mesh>
        <mesh position={[0.28, 0.08, 0.01]} renderOrder={6}>
          <circleGeometry args={[0.82, 56]} />
          <meshBasicMaterial color="#071126" transparent opacity={0.86 * opacity} depthWrite={false} />
        </mesh>
        <mesh scale={[2.9, 2.9, 1]} renderOrder={4}>
          <circleGeometry args={[0.84, 56]} />
          <meshBasicMaterial color="#b9e9ff" transparent opacity={0.055 * opacity} depthWrite={false} />
        </mesh>
      </group>

      {stars.map((star) => {
        const twinkle = reducedMotion
          ? 1
          : 0.75 +
            Math.sin(Date.now() * 0.001 * star.speed * env.motion.pulseRate + star.x) * 0.25;

        return (
          <mesh key={star.key} position={[star.x, star.y, star.z]}>
            <sphereGeometry args={[star.size * (0.8 + starMix * 0.5 + env.aliveness * 0.08), 8, 8]} />
            <meshBasicMaterial color={env.palette.star} transparent opacity={star.alpha * starMix * opacity * twinkle} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
