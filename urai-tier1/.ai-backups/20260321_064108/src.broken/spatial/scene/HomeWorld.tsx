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
  const floorCoreRef = useRef<Mesh>(null);
  const floorOuterRef = useRef<Mesh>(null);

  const orbColor = useMemo(() => new Color("#f5fbff"), []);
  const glowColor = useMemo(() => new Color("#86afff"), []);

  const visible = mode === "home" || phase === "to-lifemap" || phase === "to-home";
  const fade = phase === "to-lifemap" ? 0.28 : phase === "to-home" ? 0.88 : 1;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 1.2) * 0.018;

    if (orbRef.current) {
      orbRef.current.scale.x += (breathe - orbRef.current.scale.x) * (1 - Math.exp(-delta * 6));
      orbRef.current.scale.y = orbRef.current.scale.x;
      orbRef.current.scale.z = orbRef.current.scale.x;
    }

    if (coreGlowRef.current) {
      const s = 1.36 + Math.sin(t * 1.05) * 0.02;
      coreGlowRef.current.scale.x += (s - coreGlowRef.current.scale.x) * (1 - Math.exp(-delta * 5));
      coreGlowRef.current.scale.y = coreGlowRef.current.scale.x;
      coreGlowRef.current.scale.z = coreGlowRef.current.scale.x;
    }

    if (outerGlowRef.current) {
      const s = 1.74 + Math.sin(t * 0.75) * 0.025;
      outerGlowRef.current.scale.x += (s - outerGlowRef.current.scale.x) * (1 - Math.exp(-delta * 4));
      outerGlowRef.current.scale.y = outerGlowRef.current.scale.x;
      outerGlowRef.current.scale.z = outerGlowRef.current.scale.x;
    }

    if (avatarRef.current) {
      avatarRef.current.position.y = 2.9 + Math.sin(t * 0.55) * 0.016;
    }

    if (horizonRef.current) {
      horizonRef.current.position.y = 0.19 + Math.cos(t * 0.24) * 0.007;
    }

    if (floorCoreRef.current) {
      floorCoreRef.current.scale.x += (1.0 - floorCoreRef.current.scale.x) * (1 - Math.exp(-delta * 4));
      floorCoreRef.current.scale.y = floorCoreRef.current.scale.x;
      floorCoreRef.current.scale.z = floorCoreRef.current.scale.x;
    }

    if (floorOuterRef.current) {
      floorOuterRef.current.scale.x += (1.0 - floorOuterRef.current.scale.x) * (1 - Math.exp(-delta * 4));
      floorOuterRef.current.scale.y = floorOuterRef.current.scale.x;
      floorOuterRef.current.scale.z = floorOuterRef.current.scale.x;
    }
  });

  if (!visible) return null;

  return (
    <group scale={[fade, fade, fade]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[24, 96]} />
        <meshStandardMaterial color="#020a55" roughness={0.99} metalness={0.01} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[12.8, 24, 96]} />
        <meshBasicMaterial color="#031575" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <mesh ref={floorOuterRef} rotation={[-Math.PI / 2, 0, 0]} position={[-0.55, -0.01, 0.18]}>
        <ringGeometry args={[2.85, 6.2, 72]} />
        <meshBasicMaterial color="#08258f" transparent opacity={0.11} depthWrite={false} />
      </mesh>

      <mesh ref={floorCoreRef} rotation={[-Math.PI / 2, 0, 0]} position={[-0.55, 0.0, 0.18]}>
        <ringGeometry args={[1.55, 3.0, 72]} />
        <meshBasicMaterial color="#020817" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      <mesh ref={horizonRef} rotation={[-Math.PI / 2, 0, 0]} position={[-0.2, 0.19, -4.4]}>
        <ringGeometry args={[8.6, 15.3, 96]} />
        <meshBasicMaterial color="#2e63ff" transparent opacity={0.17} depthWrite={false} />
      </mesh>

      <mesh position={[-9.2, 1.55, -9.4]}>
        <coneGeometry args={[0.58, 3.4, 6]} />
        <meshStandardMaterial color="#06132a" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[9.4, 1.9, -10.2]}>
        <boxGeometry args={[0.92, 4.2, 0.92]} />
        <meshStandardMaterial color="#07172e" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[12.1, 0.95, -13.6]}>
        <coneGeometry args={[0.34, 2.1, 5]} />
        <meshStandardMaterial color="#07122a" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-12.0, 1.0, -13.1]}>
        <boxGeometry args={[0.66, 2.25, 0.66]} />
        <meshStandardMaterial color="#07142d" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-6.7, 1.45, -8.1]}>
        <boxGeometry args={[0.72, 2.8, 0.72]} />
        <meshStandardMaterial color="#081327" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[5.8, 1.55, -7.5]}>
        <capsuleGeometry args={[0.26, 2.2, 8, 14]} />
        <meshStandardMaterial color="#081328" roughness={1} metalness={0} />
      </mesh>

      <Float speed={0.95} rotationIntensity={0.025} floatIntensity={0.05}>
        <group position={[-0.55, 1.12, 0.08]}>
          <mesh ref={outerGlowRef}>
            <sphereGeometry args={[1.0, 40, 40]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.018} depthWrite={false} />
          </mesh>

          <mesh ref={coreGlowRef}>
            <sphereGeometry args={[1.0, 40, 40]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.052} depthWrite={false} />
          </mesh>

          <mesh
            ref={orbRef}
            castShadow
            receiveShadow
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (mode === "home") homeToLifemap();
            }}
          >
            <sphereGeometry args={[1.0, 48, 48]} />
            <meshPhysicalMaterial
              color={orbColor}
              emissive={glowColor}
              emissiveIntensity={0.54}
              roughness={0.1}
              metalness={0.02}
              transmission={0.11}
              thickness={0.62}
              clearcoat={1}
              clearcoatRoughness={0.08}
            />
          </mesh>
        </group>
      </Float>

      <group ref={avatarRef} position={[0.62, 2.9, -3.15]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.18, 2.1, 10, 18]} />
          <meshStandardMaterial color="#2968ff" emissive="#3f7dff" emissiveIntensity={0.2} roughness={0.25} metalness={0.08} />
        </mesh>
      </group>

      <mesh
        position={[5.15, 5.15, -10.35]}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (mode === "home") homeToLifemap();
        }}
      >
        <planeGeometry args={[8.4, 5.8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh
        position={[-5.95, 1.95, -3.7]}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (mode === "home") enterGround();
        }}
      >
        <planeGeometry args={[8.9, 4.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
