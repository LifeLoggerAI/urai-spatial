"use client";

import { useMemo } from "react";
import { Quaternion, Euler } from "three";
import { useArPlacementStore } from "@/spatial/xr/arPlacementStore";

export default function ArPlaneMarker() {
  const pose = useArPlacementStore((s) => s.pose);

  const rotation = useMemo(() => {
    const q = new Quaternion(pose.qx, pose.qy, pose.qz, pose.qw);
    const e = new Euler().setFromQuaternion(q, "YXZ");
    return [e.x, e.y, e.z] as [number, number, number];
  }, [pose.qx, pose.qy, pose.qz, pose.qw]);

  if (!pose.visible) return null;

  return (
    <group position={[pose.x, pose.y, pose.z]} rotation={rotation}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.22, 48]} />
        <meshBasicMaterial transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 32]} />
        <meshBasicMaterial transparent opacity={pose.hasPlane ? 0.35 : 0.15} />
      </mesh>
    </group>
  );
}
