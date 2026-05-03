"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, MathUtils } from "three";
import type { Vec3 } from "@/lib/uraiCanon/types";

export type ReplaySceneProps = {
  visible?: boolean;
  starId?: string | null;
  anchor?: Vec3;
  opacity?: number;
};

export function ReplayScene({
  visible = true,
  starId = null,
  anchor = [0, 1.8, -34],
  opacity = 1,
}: ReplaySceneProps) {
  const groupRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.position.x = MathUtils.damp(group.position.x, anchor[0], 4.8, delta);
    group.position.y = MathUtils.damp(group.position.y, anchor[1], 4.8, delta);
    group.position.z = MathUtils.damp(group.position.z, anchor[2] - 2.8, 4.8, delta);
    group.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupRef} visible={visible && !!starId}>
      <mesh>
        <sphereGeometry args={[8.5, 48, 48]} />
        <meshStandardMaterial
          color="#081225"
          emissive="#16254a"
          emissiveIntensity={0.45}
          transparent
          opacity={0.42 * opacity}
          side={1}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <ringGeometry args={[1.8, 5.8, 64]} />
        <meshBasicMaterial color="#5f7fd1" transparent opacity={0.1 * opacity} />
      </mesh>

      <mesh position={[0, 0, -4.2]}>
        <planeGeometry args={[6.2, 4.2]} />
        <meshBasicMaterial color="#20396f" transparent opacity={0.08 * opacity} />
      </mesh>

      <mesh position={[0, 0, -1.4]}>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshStandardMaterial
          color="#d5e3ff"
          emissive="#8caeff"
          emissiveIntensity={1.8}
          transparent
          opacity={0.92 * opacity}
        />
      </mesh>
    </group>
  );
}
