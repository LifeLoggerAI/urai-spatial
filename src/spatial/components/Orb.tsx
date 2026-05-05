"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type OrbProps = {
  interactive?: boolean;
  active?: boolean;
  onClick?: (source: "pointer" | "keyboard") => void;
};

export default function Orb({ interactive = true, active = false, onClick }: OrbProps) {
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

  const visualState: "idle" | "hover-focus" | "engaged" = active ? "engaged" : (hovered || focused ? "hover-focus" : "idle");
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
    const basePulse = reducedMotion ? 1 : 1 + Math.sin(t * 1.15) * 0.025;
    const pulse = basePulse + boost * 0.015;

    if (rootRef.current) {
      rootRef.current.scale.setScalar(pulse);
      rootRef.current.rotation.y = t * 0.08;
    }

    if (shellRef.current) {
      const m = shellRef.current.material as THREE.MeshPhysicalMaterial;
      m.emissiveIntensity = 5.2 + boost * 1.2;
    }

    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = (reducedMotion ? 0.19 : 0.16 + Math.sin(t * 1.4) * 0.03) + boost * 0.03;
    }

    if (haloARef.current) {
      const m = haloARef.current.material as THREE.MeshBasicMaterial;
      m.opacity = (reducedMotion ? 0.11 : 0.12 + Math.sin(t * 0.9) * 0.01) + boost * 0.03;
    }

    if (haloBRef.current) {
      const m = haloBRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = (reducedMotion ? 0.05 : 0.045 + Math.sin(t * 0.7) * 0.008) + boost * 0.015;
    }

    if (focusRingRef.current) {
      const m = focusRingRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = visualState === "idle" ? 0 : visualState === "engaged" ? 0.95 : 0.72;
    }

    if (lureRef.current) {
      lureRef.current.position.set(
        Math.cos(t * 0.85) * 1.28,
        0.08 + Math.sin(t * 1.4) * 0.05,
        Math.sin(t * 0.85) * 1.28
      );
    }
  });

  return (
    <group
      ref={rootRef}
      position={[-0.52, 1.05, 0]}
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
        <meshBasicMaterial color="#2d75ff" transparent opacity={0.045} depthWrite={false} />
      </mesh>

      <mesh ref={haloARef}>
        <primitive object={haloAGeo} attach="geometry" />
        <meshBasicMaterial color="#72d4ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <mesh ref={shellRef} castShadow receiveShadow>
        <primitive object={shellGeo} attach="geometry" />
        <meshPhysicalMaterial
          color="#eef5ff"
          emissive="#70cfff"
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
        <meshBasicMaterial color="#fffaf2" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={lureRef} scale={0.05}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#d7f4ff" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      <mesh ref={focusRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -1.02, 0]}>
        <primitive object={focusRingGeo} attach="geometry" />
        <meshBasicMaterial color="#f8fdff" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
