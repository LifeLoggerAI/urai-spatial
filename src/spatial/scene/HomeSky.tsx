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

  const stars = useMemo(
    () =>
      Array.from({ length: 220 }, (_, i) => ({
        key: `home-sky-star-${i}`,
        x: (Math.sin(i * 17.13) * 0.5 + 0.5) * 52 - 26,
        y: (Math.sin(i * 9.1 + 2.7) * 0.5 + 0.5) * 16 + 4,
        z: -30 - (Math.sin(i * 21.77) * 0.5 + 0.5) * 120,
        size: 0.01 + (Math.sin(i * 4.77 + 7.2) * 0.5 + 0.5) * 0.03,
        alpha: 0.1 + (Math.sin(i * 6.31 + 4.2) * 0.5 + 0.5) * 0.3,
        speed: 0.4 + (Math.sin(i * 3.33 + 1.1) * 0.5 + 0.5) * 0.8,
      })),
    []
  );

  const starMix = env.scene.starMix;
  const opacity = env.scene.skyOpacity;
  const nebulaOpacity = 0.06 + starMix * 0.05 + env.aliveness * 0.025;

  useFrame(({ clock }) => {
    if (!skyRoot.current || !nebula.current) return;

    if (!reducedMotion) {
      const t = clock.elapsedTime;
      skyRoot.current.rotation.y = Math.sin(t * env.motion.drift) * 0.04;
      skyRoot.current.rotation.x = Math.sin(t * env.motion.drift * 0.67) * 0.01;
      nebula.current.rotation.z = Math.sin(t * env.motion.drift * 1.35) * 0.06;
    } else {
      skyRoot.current.rotation.set(0, 0, 0);
      nebula.current.rotation.set(0, 0, 0);
    }
  });

  return (
    <group ref={skyRoot} visible={opacity > 0.001} userData={{ mood: env.mood, aliveness: env.aliveness }}>
      <mesh scale={[1, 0.62, 1]} position={[0, -4.5, -48]}>
        <sphereGeometry args={[84, 64, 48, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshBasicMaterial color={env.palette.sky} side={1} transparent opacity={0.98 * opacity} depthWrite={false} />
      </mesh>

      <mesh ref={nebula} position={[0, 11.4, -56]}>
        <circleGeometry args={[42, 48]} />
        <meshBasicMaterial color={env.palette.nebula} transparent opacity={nebulaOpacity * opacity} depthWrite={false} />
      </mesh>

      {stars.map((star) => {
        const twinkle = reducedMotion ? 1 : 0.75 + Math.sin(Date.now() * 0.001 * star.speed * env.motion.pulseRate + star.x) * 0.25;
        return (
          <mesh key={star.key} position={[star.x, star.y, star.z]}>
            <sphereGeometry args={[star.size * (0.8 + starMix * 0.5 + env.aliveness * 0.08), 8, 8]} />
            <meshBasicMaterial
              color={env.palette.star}
              transparent
              opacity={star.alpha * starMix * opacity * twinkle}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
