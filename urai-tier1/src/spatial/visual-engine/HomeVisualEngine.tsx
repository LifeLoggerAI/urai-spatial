"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type HomeVisualEngineProps = {
  visible: boolean;
  phase?: string;
  ascentProgress?: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

export function HomeVisualEngine({
  visible,
  phase = "HOME",
  ascentProgress = 0,
}: HomeVisualEngineProps) {
  const rootRef = useRef<THREE.Group>(null);
  const horizonRef = useRef<THREE.Mesh>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const contactRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const fogRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const ascent = phase === "ASCENT" ? clamp01(ascentProgress) : phase === "HOME" ? 0 : 1;
    const away = easeOutCubic(ascent);
    const presence = visible ? 1 - away : 0;

    const orb = state.scene.getObjectByName("URAI_HOME_ORB_SYSTEM");
    const orbWorld = new THREE.Vector3();

    if (orb) {
      orb.getWorldPosition(orbWorld);
    } else {
      orbWorld.set(Math.sin(t * 0.3) * 0.18, 0, Math.cos(t * 0.25) * 0.16);
    }

    const localX = orbWorld.x * 0.72;
    const localZ = orbWorld.z * 0.32;

    if (rootRef.current) {
      rootRef.current.visible = presence > 0.01;
      rootRef.current.position.y = -0.05 - away * 1.15;
      rootRef.current.scale.setScalar(1 + away * 0.22);
    }

    if (horizonRef.current) {
      horizonRef.current.rotation.z = Math.sin(t * 0.04) * 0.004;
      const mat = horizonRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.32 * presence;
    }

    if (surfaceRef.current) {
      surfaceRef.current.rotation.z = Math.sin(t * 0.06) * 0.006;
      const mat = surfaceRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.84 * presence;
      mat.emissiveIntensity = (0.38 + Math.sin(t * 0.22) * 0.035) * Math.max(0.35, presence);
    }

    if (fogRef.current) {
      const mat = fogRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.18 + Math.sin(t * 0.2) * 0.02 + away * 0.06) * presence;
    }

    if (rippleRef.current) {
      const p = 1 + Math.sin(t * 0.72) * 0.035;
      rippleRef.current.position.x = localX * 0.42;
      rippleRef.current.position.z = localZ * 0.42;
      rippleRef.current.scale.set(9.2 * p * (1 + away * 0.22), 2.4 * p * (1 + away * 0.1), 1);
      const mat = rippleRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.08 + Math.sin(t * 0.72) * 0.015) * presence;
    }

    if (contactRef.current) {
      const p = 1 + Math.sin(t * 1.2) * 0.055;
      contactRef.current.position.x = localX;
      contactRef.current.position.z = localZ;
      contactRef.current.scale.set(5.05 * p * (1 + away * 0.16), 1.22 * p * (1 + away * 0.08), 1);
      const mat = contactRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.24 + Math.sin(t * 1.2) * 0.03) * presence;
    }

    if (shadowRef.current) {
      shadowRef.current.position.x = localX;
      shadowRef.current.position.z = localZ;
      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 * presence;
    }
  });

  return (
    <group ref={rootRef} name="URAI_HOME_VISUAL_ENGINE_GROUND_LOCK_V3" position={[0, -0.05, -8.8]}>
      <mesh ref={horizonRef} position={[0, -1.28, -2.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[34, 14, 1]}>
        <circleGeometry args={[1, 192]} />
        <meshBasicMaterial color={new THREE.Color("#180735")} transparent opacity={0.32} depthWrite={false} />
      </mesh>

      <mesh ref={surfaceRef} position={[0, -1.34, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[28, 11.5, 1]}>
        <circleGeometry args={[1, 224]} />
        <meshStandardMaterial
          color={new THREE.Color("#070013")}
          emissive={new THREE.Color("#18003b")}
          emissiveIntensity={0.42}
          roughness={0.98}
          metalness={0}
          transparent
          opacity={0.84}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={fogRef} position={[0, -1.08, -3.4]} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 7.5, 1]}>
        <circleGeometry args={[1, 160]} />
        <meshBasicMaterial color={new THREE.Color("#2a1158")} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh ref={rippleRef} position={[0, -0.88, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[9.2, 2.4, 1]}>
        <ringGeometry args={[0.48, 1, 160]} />
        <meshBasicMaterial
          color={new THREE.Color("#8147ff")}
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={contactRef} position={[0, -0.865, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[5.05, 1.22, 1]}>
        <circleGeometry args={[1, 128]} />
        <meshBasicMaterial
          color={new THREE.Color("#9c5cff")}
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={shadowRef} position={[0, -0.855, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[5.8, 1.3, 1]}>
        <circleGeometry args={[1, 128]} />
        <meshBasicMaterial color={new THREE.Color("#020008")} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}
