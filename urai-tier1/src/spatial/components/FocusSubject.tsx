"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type FocusSubjectProps = any & {
  visible?: boolean;
  interactive?: boolean;
  opacity?: number;
  starId?: string | null;
  position?: [number, number, number];
  onEnterReplay?: (() => void) | null;
  enteringReplay?: boolean;
};

export default function FocusSubject({
  visible = false,
  interactive = true,
  opacity = 1,
  starId = null,
  position = [0, 0, -3],
  onEnterReplay = null,
  enteringReplay = false,
  ...props
}: FocusSubjectProps) {
  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    rootRef.current.position.set(position[0], position[1], position[2]);
  }, [position]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const gate = visible ? opacity : 0;

    if (rootRef.current) {
      rootRef.current.visible = visible || gate > 0.001;
      rootRef.current.rotation.y += delta * 0.08 * gate;
      rootRef.current.position.y = THREE.MathUtils.damp(
        rootRef.current.position.y,
        position[1] + Math.sin(t * 0.6) * 0.03,
        3.0,
        delta
      );
      rootRef.current.scale.setScalar(
        THREE.MathUtils.damp(rootRef.current.scale.x, enteringReplay ? 1.05 : 1.0, 4.0, delta)
      );
    }

    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.12 * gate, 5.0, delta);
      shellRef.current.rotation.y += delta * 0.05 * gate;
    }

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.85 * gate, 5.5, delta);
      coreRef.current.rotation.y += delta * 0.12 * gate;
      coreRef.current.rotation.x = Math.sin(t * 0.5) * 0.03 * gate;
    }
  });

  return (
    <group
      ref={rootRef}
      visible={visible || opacity > 0.001}
      {...props}
      onClick={interactive && onEnterReplay ? () => onEnterReplay() : undefined}
    >
      <pointLight position={[0, 0.2, 0.8]} intensity={1.4} distance={8} />
      <mesh ref={shellRef}>
        <sphereGeometry args={[0.92, 48, 48]} />
        <meshBasicMaterial
          color="#7d66ff"
          transparent
          opacity={0.001}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.42, 6]} />
        <meshStandardMaterial
          color="#b9abff"
          emissive="#7f67ff"
          emissiveIntensity={1.7}
          roughness={0.28}
          metalness={0.08}
          transparent
          opacity={0.001}
        />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.92, 96]} />
        <meshBasicMaterial
          color="#cdc3ff"
          transparent
          opacity={0.14 * opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
