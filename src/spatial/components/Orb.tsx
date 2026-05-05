"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEnvironmentSignal } from "../signals/environmentSignal";

type OrbProps = {
  interactive?: boolean;
  active?: boolean;
  onClick?: (source: "pointer" | "keyboard") => void;
};

export default function Orb({ interactive = true, active = false, onClick }: OrbProps) {
  const env = useEnvironmentSignal();
  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloARef = useRef<THREE.Mesh>(null);
  const haloBRef = useRef<THREE.Mesh>(null);
  const focusRingRef = useRef<THREE.Mesh>(null);
  const hitTargetRef = useRef<THREE.Mesh>(null);
  const lureRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const shellGeo = useMemo(() => new THREE.SphereGeometry(0.94, 64, 64), []);
  const coreGeo = useMemo(() => new THREE.SphereGeometry(0.52, 32, 32), []);
  const haloAGeo = useMemo(() => new THREE.SphereGeometry(1.2, 24, 24), []);
  const haloBGeo = useMemo(() => new THREE.SphereGeometry(1.68, 20, 20), []);
  const focusRingGeo = useMemo(() => new THREE.TorusGeometry(1.34, 0.05, 16, 64), []);
  const hitTargetGeo = useMemo(() => new THREE.SphereGeometry(1.38, 24, 24), []);

  const visualState: "idle" | "hover-focus" | "engaged" = active ? "engaged" : hovered || focused ? "hover-focus" : "idle";
  const triggerActivate = (source: "pointer" | "keyboard") => {
    if (interactive && onClick) onClick(source);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!focused) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      triggerActivate("keyboard");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused, interactive, onClick]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const boost = visualState === "engaged" ? 2 : visualState === "hover-focus" ? 1 : 0;
    const signalEnergy = env.scene.orbEnergy;
    const basePulse = reducedMotion ? 1 : 1 + Math.sin(t * env.motion.pulseRate) * (0.018 + env.aliveness * 0.012);
    const pulse = basePulse + boost * 0.015;

    if (rootRef.current) {
      rootRef.current.scale.setScalar(pulse);
      rootRef.current.rotation.y = reducedMotion ? 0 : t * (0.045 + env.motion.drift);
    }

    if (shellRef.current) {
      const m = shellRef.current.material as THREE.MeshPhysicalMaterial;
      m.emissive.set(env.palette.orbHalo);
      m.emissiveIntensity = 4.8 + signalEnergy * 1.2 + boost * 0.9;
    }

    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.color.set(env.palette.orbCore);
      m.opacity = (reducedMotion ? 0.18 : 0.15 + Math.sin(t * env.motion.pulseRate * 1.2) * 0.025) + boost * 0.03 + env.aliveness * 0.025;
    }

    if (haloARef.current) {
      const m = haloARef.current.material as THREE.MeshBasicMaterial;
      m.color.set(env.palette.orbHalo);
      m.opacity = (reducedMotion ? 0.1 : 0.105 + Math.sin(t * env.motion.breathRate) * 0.014) + boost * 0.03 + env.aliveness * 0.035;
    }

    if (haloBRef.current) {
      const m = haloBRef.current.material as THREE.MeshBasicMaterial;
      m.color.set(env.palette.accent);
      m.opacity = (reducedMotion ? 0.042 : 0.04 + Math.sin(t * env.motion.breathRate * 0.8) * 0.01) + boost * 0.015 + env.emotionalIntensity * 0.025;
    }

    if (focusRingRef.current) {
      const m = focusRingRef.current.material as THREE.MeshBasicMaterial;
      m.color.set(env.palette.star);
      m.opacity = visualState === "idle" ? 0 : visualState === "engaged" ? 0.95 : 0.72;
    }

    if (lureRef.current) {
      lureRef.current.position.set(
        Math.cos(t * env.motion.pulseRate * 0.72) * 1.28,
        0.08 + Math.sin(t * env.motion.pulseRate) * 0.05,
        Math.sin(t * env.motion.pulseRate * 0.72) * 1.28
      );
      const m = lureRef.current.material as THREE.MeshBasicMaterial;
      m.color.set(env.palette.star);
      m.opacity = 0.26 + env.aliveness * 0.12;
    }
  });

  return (
    <group
      ref={rootRef}
      position={[-0.52, 1.05, 0]}
      userData={{ mood: env.mood, aliveness: env.aliveness, presence: env.presence }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        setFocused(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        setFocused(true);
      }}
      onClick={(e) => {
        e.stopPropagation();
        triggerActivate("pointer");
      }}
    >
      <mesh ref={hitTargetRef}>
        <primitive object={hitTargetGeo} attach="geometry" />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={haloBRef}>
        <primitive object={haloBGeo} attach="geometry" />
        <meshBasicMaterial color={env.palette.accent} transparent opacity={0.045} depthWrite={false} />
      </mesh>

      <mesh ref={haloARef}>
        <primitive object={haloAGeo} attach="geometry" />
        <meshBasicMaterial color={env.palette.orbHalo} transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <mesh ref={shellRef} castShadow receiveShadow>
        <primitive object={shellGeo} attach="geometry" />
        <meshPhysicalMaterial
          color="#eef5ff"
          emissive={env.palette.orbHalo}
          emissiveIntensity={5.4}
          roughness={0.1}
          metalness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.04}
          transmission={0.08}
          thickness={0.48}
          ior={1.16}
        />
      </mesh>

      <mesh ref={coreRef}>
        <primitive object={coreGeo} attach="geometry" />
        <meshBasicMaterial color={env.palette.orbCore} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={lureRef} scale={0.05}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={env.palette.star} transparent opacity={0.34} depthWrite={false} />
      </mesh>

      <mesh ref={focusRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -1.02, 0]}>
        <primitive object={focusRingGeo} attach="geometry" />
        <meshBasicMaterial color={env.palette.star} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
