"use client";

import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { Color } from "three";
import { useSceneStore } from "../state/sceneStore";

export default function HomeWorld() {
  const mode = useSceneStore((state) => state.mode);
  const phase = useSceneStore((state) => state.phase);
  const homeToLifemap = useSceneStore((state) => state.homeToLifemap);
  const enterGround = useSceneStore((state) => state.enterGround);

  const orbRef = useRef<Mesh>(null);
  const coreGlowRef = useRef<Mesh>(null);
  const outerGlowRef = useRef<Mesh>(null);
  const avatarRef = useRef<Group>(null);
  const horizonRef = useRef<Mesh>(null);

  const orbColor = useMemo(() => new Color("#f5fbff"), []);
  const glowColor = useMemo(() => new Color("#84adff"), []);

  const visible = mode === "home" || phase === "to-lifemap" || phase === "to-home";
  const fade = phase === "to-lifemap" ? 0.28 : phase === "to-home" ? 0.88 : 1;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 1.25) * 0.018;

    if (orbRef.current) {
      orbRef.current.scale.x += (breathe - orbRef.current.scale.x) * (1 - Math.exp(-delta * 6));
      orbRef.current.scale.y = orbRef.current.scale.x;
      orbRef.current.scale.z = orbRef.current.scale.x;
    }

    if (coreGlowRef.current) {
      const s = 1.52 + Math.sin(t * 1.1) * 0.025;
      coreGlowRef.current.scale.x += (s - coreGlowRef.current.scale.x) * (1 - Math.exp(-delta * 5));
      coreGlowRef.current.scale.y = coreGlowRef.current.scale.x;
      coreGlowRef.current.scale.z = coreGlowRef.current.scale.x;
    }

    if (outerGlowRef.current) {
      const s = 1.92 + Math.sin(t * 0.8) * 0.03;
      outerGlowRef.current.scale.x += (s - outerGlowRef.current.scale.x) * (1 - Math.exp(-delta * 4));
      outerGlowRef.current.scale.y = outerGlowRef.current.scale.x;
      outerGlowRef.current.scale.z = outerGlowRef.current.scale.x;
    }

    if (avatarRef.current) {
      avatarRef.current.position.y = 2.98 + Math.sin(t * 0.6) * 0.02;
    }

    if (horizonRef.current) {
      horizonRef.current.position.y = 0.17 + Math.cos(t * 0.28) * 0.008;
    }
  });

  if (!visible) return null;

  return (
    <group scale={[fade, fade, fade]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[22, 96]} />
        <meshStandardMaterial color="#010a56" roughness={0.99} metalness={0.01} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[7.2, 22, 96]} />
        <meshBasicMaterial color="#041f8f" transparent opacity={0.14} depthWrite={false} />
      </mesh>

      <mesh ref={horizonRef} rotation={[-Math.PI / 2, 0, 0]} position={[-0.45, 0.17, -3.6]}>
        <ringGeometry args={[7.8, 14.4, 96]} />
        <meshBasicMaterial color="#2e63ff" transparent opacity={0.14} depthWrite={false} />
      </mesh>

      <mesh position={[-8.2, 1.7, -8.8]}>
        <coneGeometry args={[0.68, 4.0, 6]} />
        <meshStandardMaterial color="#06132b" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[7.9, 2.0, -9.6]}>
        <boxGeometry args={[1.05, 4.5, 1.05]} />
        <meshStandardMaterial color="#07172f" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[10.6, 1.1, -12.5]}>
        <coneGeometry args={[0.42, 2.5, 5]} />
        <meshStandardMaterial color="#07122a" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-10.6, 1.2, -12.1]}>
        <boxGeometry args={[0.78, 2.8, 0.78]} />
        <meshStandardMaterial color="#07142f" roughness={1} metalness={0} />
      </mesh>

      <Float speed={1.0} rotationIntensity={0.03} floatIntensity={0.06}>
        <group position={[-0.55, 1.14, 0.04]}>
          <mesh ref={outerGlowRef}>
            <sphereGeometry args={[1.02, 40, 40]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.028} depthWrite={false} />
          </mesh>

          <mesh ref={coreGlowRef}>
            <sphereGeometry args={[1.02, 40, 40]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.075} depthWrite={false} />
          </mesh>

          <mesh
            ref={orbRef}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              if (mode === "home") homeToLifemap();
            }}
          >
            <sphereGeometry args={[1.02, 48, 48]} />
            <meshPhysicalMaterial
              color={orbColor}
              emissive={glowColor}
              emissiveIntensity={0.62}
              roughness={0.09}
              metalness={0.02}
              transmission={0.12}
              thickness={0.68}
              clearcoat={1}
              clearcoatRoughness={0.08}
            />
          </mesh>
        </group>
      </Float>

      <group ref={avatarRef} position={[0.18, 2.98, -2.95]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.22, 2.35, 10, 18]} />
          <meshStandardMaterial color="#2665ff" emissive="#3c7bff" emissiveIntensity={0.28} roughness={0.24} metalness={0.1} />
        </mesh>
      </group>

      <mesh
        position={[4.9, 5.2, -10.2]}
        onClick={(event) => {
          event.stopPropagation();
          if (mode === "home") homeToLifemap();
        }}
      >
        <planeGeometry args={[8.2, 5.8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh
        position={[-5.7, 2.05, -3.6]}
        onClick={(event) => {
          event.stopPropagation();
          if (mode === "home") enterGround();
        }}
      >
        <planeGeometry args={[8.6, 4.4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
