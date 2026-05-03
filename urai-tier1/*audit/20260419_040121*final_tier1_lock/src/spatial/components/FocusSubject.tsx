"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MathUtils } from "three";
import type { Vec3 } from "@/lib/uraiCanon/types";

export type FocusSubjectProps = {
  visible?: boolean;
  starId?: string | null;
  position?: Vec3;
  interactive?: boolean;
  opacity?: number;
  onEnterReplay?: () => void;
};

export function FocusSubject({
  visible = true,
  starId = null,
  position = [0, 1.8, -34],
  interactive = false,
  opacity = 1,
  onEnterReplay,
}: FocusSubjectProps) {
  const groupRef = useRef<Group>(null);

  const resolvedPosition = useMemo<Vec3>(() => position, [position]);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.position.x = MathUtils.damp(group.position.x, resolvedPosition[0], 5.4, delta);
    group.position.y = MathUtils.damp(group.position.y, resolvedPosition[1], 5.4, delta);
    group.position.z = MathUtils.damp(group.position.z, resolvedPosition[2], 5.4, delta);
    group.rotation.z += delta * 0.12;
  });

  return (
    <group ref={groupRef} visible={visible && !!starId}>
      <mesh onPointerDown={interactive ? onEnterReplay : undefined}>
        <sphereGeometry args={[0.68, 32, 32]} />
        <meshStandardMaterial
          color="#dbe6ff"
          emissive="#8eb0ff"
          emissiveIntensity={1.6}
          transparent
          opacity={opacity}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.05, 14, 64]} />
        <meshBasicMaterial color="#9fc4ff" transparent opacity={opacity * 0.34} />
      </mesh>

      <mesh rotation={[0.2, 0.35, Math.PI / 2]}>
        <torusGeometry args={[2.35, 0.04, 12, 64]} />
        <meshBasicMaterial color="#c5dcff" transparent opacity={opacity * 0.18} />
      </mesh>
    </group>
  );
}
