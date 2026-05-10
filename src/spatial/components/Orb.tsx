"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useEnvironmentSignal } from "../signals/environmentSignal";

type OrbProps = {
  interactive?: boolean;
  active?: boolean;
  visualIntensity?: number;
  busy?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (source: "pointer" | "keyboard") => void;
  onFocus?: () => void;
};

export default function Orb({
  interactive = true,
  active = false,
  visualIntensity = 0,
  busy = false,
  disabled = false,
  ariaLabel,
  onClick,
  onFocus,
}: OrbProps) {
  const env = useEnvironmentSignal();

  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const innerHaloRef = useRef<THREE.Mesh>(null);
  const outerHaloRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const focusRingRef = useRef<THREE.Mesh>(null);
  const lureRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const canInteract = interactive && !disabled && !busy;

  const triggerActivate = (source: "pointer" | "keyboard") => {
    if (canInteract && onClick) onClick(source);
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const stateBoost = THREE.MathUtils.clamp(visualIntensity, 0, 1.6);
    const boost = (active ? 1 : 0) + (hovered && canInteract ? 1 : 0) + stateBoost;
    const signalEnergy = env.scene.orbEnergy;

    const pulse = reducedMotion
      ? 1 + boost * 0.012
      : 1 + Math.sin(t * env.motion.pulseRate) * (0.018 + env.aliveness * 0.012) + boost * 0.016;

    if (rootRef.current) {
      rootRef.current.scale.setScalar(pulse);
      rootRef.current.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.18) * 0.08;
    }

    if (shellRef.current) {
      const material = shellRef.current.material as THREE.MeshPhysicalMaterial;
      material.emissive.set(env.palette.orbHalo);
      material.emissiveIntensity = disabled ? 1.6 : busy ? 6.6 : 3.9 + signalEnergy * 1.15 + boost * 0.85;
      material.opacity = disabled ? 0.5 : 0.88;
    }

    if (coreRef.current) {
      const material = coreRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = disabled ? 0.38 : 0.78 + Math.min(0.18, boost * 0.05);
    }

    if (innerHaloRef.current) {
      innerHaloRef.current.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(t * 1.4) * 0.035);
      const material = innerHaloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = disabled ? 0.08 : 0.18 + signalEnergy * 0.05 + boost * 0.035;
    }

    if (outerHaloRef.current) {
      outerHaloRef.current.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(t * 0.82 + 1.7) * 0.045);
      const material = outerHaloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = disabled ? 0.05 : 0.11 + boost * 0.024;
    }

    if (ringARef.current) {
      ringARef.current.rotation.z = reducedMotion ? 0.22 : t * 0.22;
      ringARef.current.rotation.x = Math.PI / 2.65;
    }

    if (ringBRef.current) {
      ringBRef.current.rotation.z = reducedMotion ? -0.36 : -t * 0.17;
      ringBRef.current.rotation.x = Math.PI / 2.1;
    }

    if (focusRingRef.current) {
      focusRingRef.current.visible = focused || hovered || busy;
      focusRingRef.current.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(t * 1.8) * 0.03);
      const material = focusRingRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = busy ? 0.28 : hovered ? 0.22 : focused ? 0.14 : 0;
    }

    if (lureRef.current) {
      lureRef.current.rotation.z = reducedMotion ? 0 : t * 0.11;
      const material = lureRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = disabled ? 0.06 : 0.12 + Math.sin(t * 0.9) * 0.035;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!focused) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerActivate("keyboard");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focused, canInteract, onClick]);

  return (
    <group
      ref={rootRef}
      userData={{ ariaLabel }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!canInteract) return;
        setHovered(true);
        setFocused(true);
        onFocus?.();
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
      }}
      onClick={(event) => {
        event.stopPropagation();
        triggerActivate("pointer");
      }}
    >
      <mesh ref={outerHaloRef} renderOrder={8}>
        <sphereGeometry args={[0.86, 48, 48]} />
        <meshBasicMaterial
          color="#74d9ff"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={innerHaloRef} renderOrder={9}>
        <sphereGeometry args={[0.58, 48, 48]} />
        <meshBasicMaterial
          color="#b8f0ff"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={shellRef} renderOrder={12} castShadow>
        <sphereGeometry args={[0.34, 64, 64]} />
        <meshPhysicalMaterial
          color="#8fdcff"
          emissive="#58cfff"
          emissiveIntensity={4}
          roughness={0.18}
          metalness={0.02}
          transmission={0.15}
          thickness={0.72}
          clearcoat={1}
          clearcoatRoughness={0.12}
          transparent
          opacity={0.88}
        />
      </mesh>

      <mesh ref={coreRef} renderOrder={13}>
        <sphereGeometry args={[0.18, 40, 40]} />
        <meshBasicMaterial
          color="#f6fdff"
          transparent
          opacity={0.82}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={lureRef} renderOrder={10} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.51, 96]} />
        <meshBasicMaterial
          color="#d7f8ff"
          transparent
          opacity={0.13}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ringARef} renderOrder={11}>
        <torusGeometry args={[0.46, 0.006, 8, 112]} />
        <meshBasicMaterial
          color="#d9f6ff"
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ringBRef} renderOrder={11}>
        <torusGeometry args={[0.62, 0.0045, 8, 112]} />
        <meshBasicMaterial
          color="#a9d8ff"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={focusRingRef} renderOrder={14} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.76, 0.79, 96]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh visible={canInteract}>
        <sphereGeometry args={[0.9, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
