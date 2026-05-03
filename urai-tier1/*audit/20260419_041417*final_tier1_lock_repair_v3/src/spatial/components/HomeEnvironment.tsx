"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BackSide, Group, MathUtils, MeshStandardMaterial } from "three";
import type { CanonPhase } from "@/lib/uraiCanon/types";

export type HomeEnvironmentProps = {
  visible?: boolean;
  interactive?: boolean;
  onSkySelect?: () => void;
  onGroundSelect?: () => void;
  onOrbSelect?: () => void;
  phase?: CanonPhase;
  dim?: number;
};

export function HomeEnvironment({
  visible = true,
  interactive = false,
  onSkySelect,
  onGroundSelect,
  onOrbSelect,
  phase = "HOME",
  dim = 0,
}: HomeEnvironmentProps) {
  const groupRef = useRef<Group>(null);
  const orbMatRef = useRef<MeshStandardMaterial>(null);
  const skyMatRef = useRef<MeshStandardMaterial>(null);
  const groundMatRef = useRef<MeshStandardMaterial>(null);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetY = phase === "ASCENT" ? -5.4 : 0;
    const targetZ = phase === "ASCENT" ? -16 : 0;
    const targetScale = phase === "ASCENT" ? 0.82 : 1;
    const opacityFloor = phase === "ASCENT" ? 0.88 : 1;
    const visibilityScale = MathUtils.clamp(1 - dim, 0.08, 1);

    group.position.y = MathUtils.damp(group.position.y, targetY, 3.5, delta);
    group.position.z = MathUtils.damp(group.position.z, targetZ, 3.5, delta);
    group.scale.setScalar(MathUtils.damp(group.scale.x, targetScale, 3.5, delta));

    if (orbMatRef.current) {
      orbMatRef.current.opacity = MathUtils.damp(
        orbMatRef.current.opacity,
        0.92 * visibilityScale * opacityFloor,
        3.2,
        delta,
      );
      orbMatRef.current.emissiveIntensity = MathUtils.damp(
        orbMatRef.current.emissiveIntensity,
        1.7 * visibilityScale,
        3.2,
        delta,
      );
    }

    if (skyMatRef.current) {
      skyMatRef.current.opacity = MathUtils.damp(
        skyMatRef.current.opacity,
        0.32 * visibilityScale * opacityFloor,
        2.8,
        delta,
      );
    }

    if (groundMatRef.current) {
      groundMatRef.current.opacity = MathUtils.damp(
        groundMatRef.current.opacity,
        0.96 * visibilityScale * opacityFloor,
        2.8,
        delta,
      );
      groundMatRef.current.emissiveIntensity = MathUtils.damp(
        groundMatRef.current.emissiveIntensity,
        0.12 * visibilityScale,
        2.8,
        delta,
      );
    }
  });

  return (
    <group ref={groupRef} visible={visible}>
      <mesh position={[0, 9, -28]}>
        <sphereGeometry args={[42, 48, 48]} />
        <meshStandardMaterial
          ref={skyMatRef}
          color="#14306b"
          emissive="#243a84"
          emissiveIntensity={0.6}
          side={BackSide}
          transparent
          opacity={0.32}
        />
      </mesh>

      <mesh
        position={[0, 6.5, -18]}
        onPointerDown={interactive ? onSkySelect : undefined}
      >
        <planeGeometry args={[28, 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh
        position={[0, -2.3, -10]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={interactive ? onGroundSelect : undefined}
      >
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial
          ref={groundMatRef}
          color="#071119"
          emissive="#193049"
          emissiveIntensity={0.12}
          transparent
          opacity={0.96}
          roughness={0.96}
          metalness={0.08}
        />
      </mesh>

      <mesh position={[0, 1.15, -7.2]} onPointerDown={interactive ? onOrbSelect : undefined}>
        <sphereGeometry args={[1.28, 48, 48]} />
        <meshStandardMaterial
          ref={orbMatRef}
          color="#bfd2ff"
          emissive="#7aa5ff"
          emissiveIntensity={1.7}
          transparent
          opacity={0.92}
          roughness={0.18}
          metalness={0.28}
        />
      </mesh>

      <mesh position={[0, 1.15, -7.2]}>
        <sphereGeometry args={[2.3, 48, 48]} />
        <meshBasicMaterial color="#7aa5ff" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}
