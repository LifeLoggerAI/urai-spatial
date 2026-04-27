"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type ReplaySceneProps = any & {
  visible?: boolean;
  opacity?: number;
  starId?: string | null;
  hold?: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export default function ReplayScene({
  visible = false,
  opacity = 0,
  starId = null,
  hold = 1,
  ...props
}: ReplaySceneProps) {
  const rootRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const hazeRef = useRef<THREE.Points>(null);

  const haze = useMemo(() => {
    const count = 320;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2.1 + Math.random() * 6.4;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 3.8;
      positions[i * 3 + 0] = Math.cos(a) * r * (0.5 + Math.random());
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = -Math.random() * 9.5;
      sizes[i] = 0.4 + Math.random() * 1.9;
    }
    return { positions, sizes };
  }, [starId]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const gate = clamp01(opacity) * clamp01(hold);

    if (rootRef.current) {
      rootRef.current.visible = visible || gate > 0.001;
        rootRef.current.position.z = THREE.MathUtils.damp(rootRef.current.position.z, 0.0 + gate * -0.2, 3.0, delta);
      rootRef.current.position.y = THREE.MathUtils.damp(rootRef.current.position.y, -0.03 - gate * 0.05, 3.2, delta);
      rootRef.current.rotation.y += delta * 0.025 * gate;
    }

    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.06 + gate * 0.34, 4.5, delta);
      shellRef.current.scale.x = THREE.MathUtils.damp(shellRef.current.scale.x, 1.08 + gate * 0.05, 4.0, delta);
      shellRef.current.scale.y = THREE.MathUtils.damp(shellRef.current.scale.y, 1.08 + gate * 0.05, 4.0, delta);
      shellRef.current.scale.z = THREE.MathUtils.damp(shellRef.current.scale.z, 1.08 + gate * 0.08, 4.0, delta);
      shellRef.current.rotation.y += delta * 0.035 * gate;
    }

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.18 + gate * 0.72, 5.0, delta);
        coreRef.current.position.z = THREE.MathUtils.damp(coreRef.current.position.z, -0.3 - gate * 0.2, 4.2, delta);
      coreRef.current.scale.x = THREE.MathUtils.damp(coreRef.current.scale.x, 1.0 + gate * 0.12, 4.0, delta);
      coreRef.current.scale.y = THREE.MathUtils.damp(coreRef.current.scale.y, 1.0 + gate * 0.12, 4.0, delta);
      coreRef.current.scale.z = THREE.MathUtils.damp(coreRef.current.scale.z, 1.0 + gate * 0.2, 4.0, delta);
      coreRef.current.rotation.y += delta * 0.055 * gate;
      coreRef.current.rotation.x = Math.sin(t * 0.2) * 0.02 * gate;
    }

    if (hazeRef.current) {
      const mat = hazeRef.current.material as THREE.PointsMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, gate * 0.58, 3.8, delta);
        hazeRef.current.position.z = THREE.MathUtils.damp(hazeRef.current.position.z, -0.2 - gate * 0.1, 3.0, delta);
      hazeRef.current.rotation.y += delta * 0.018 * gate;
      hazeRef.current.rotation.x = Math.sin(t * 0.08) * 0.04 * gate;
    }
  });

  return (
    <group ref={rootRef} visible={visible || opacity > 0.001} {...props}>
      <ambientLight intensity={0.45 + opacity * 0.35} />
      <pointLight position={[0, 0.8, -1.8]} intensity={2.6 + opacity * 2.0} distance={14} />
      <pointLight position={[0, -0.5, -3.0]} intensity={1.0 + opacity * 1.2} distance={11} />

      <mesh ref={shellRef} position={[0, 0, -2.2]}>
        <sphereGeometry args={[4.8, 48, 48]} />
        <meshBasicMaterial color="#6b4cff" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <points ref={hazeRef} position={[0, 0, -1.4]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[haze.positions, 3]}
            count={haze.positions.length / 3}
            array={haze.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[haze.sizes, 1]}
            count={haze.sizes.length}
            array={haze.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#a28dff"
          size={0.06}
          sizeAttenuation
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh ref={coreRef} position={[0, 0, -1.4]}>
        <icosahedronGeometry args={[0.9, 6]} />
        <meshStandardMaterial
          color="#9b7bff"
          emissive="#7c5cff"
          emissiveIntensity={1.8}
          roughness={0.3}
          metalness={0.05}
          transparent
          opacity={0.12}
        />
      </mesh>

      <mesh position={[0, 0, -2.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 2.6, 96]} />
        <meshBasicMaterial
          color="#c8bdff"
          transparent
          opacity={0.08 + opacity * 0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -1.1, -3.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6.2, 96]} />
        <meshBasicMaterial color="#090611" transparent opacity={0.42 + opacity * 0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}
