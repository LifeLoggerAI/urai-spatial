"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useSceneStore } from "../state/sceneStore";

type HomeAvatarProps = {
  orbPosition?: [number, number, number];
  lowPoly?: boolean;
};

const DEFAULT_ORB_POSITION: [number, number, number] = [-0.52, 1.05, 0];

export default function HomeAvatar({ orbPosition = DEFAULT_ORB_POSITION, lowPoly = false }: HomeAvatarProps) {
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  const avatarState = useSceneStore((s) => s.avatarState);
  const setAvatarState = useSceneStore((s) => s.setAvatarState);

  const bodyGeometry = useMemo(
    () =>
      lowPoly
        ? new THREE.CapsuleGeometry(0.22, 0.6, 2, 6)
        : new THREE.CapsuleGeometry(0.24, 0.72, 4, 14),
    [lowPoly]
  );

  const headGeometry = useMemo(
    () => (lowPoly ? new THREE.IcosahedronGeometry(0.18, 0) : new THREE.SphereGeometry(0.18, 20, 20)),
    [lowPoly]
  );

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    const t = clock.getElapsedTime();
    const bob = Math.sin(t * 1.8) * 0.025;
    root.position.y = 0.96 + bob;

    if (avatarState === "transitioning") {
      root.rotation.y += delta * 2.8;
      root.position.x = -1.9 + Math.sin(t * 4.4) * 0.06;
      root.position.z = 0.72 + Math.cos(t * 3.6) * 0.06;
      return;
    }

    root.position.x = -1.9;
    root.position.z = 0.72;

    const lookAtOrb = avatarState === "lookAtOrb" || avatarState === "idle";
    if (lookAtOrb) {
      const target = new THREE.Vector3(...orbPosition);
      const dir = target.sub(root.position);
      const yaw = Math.atan2(dir.x, dir.z);
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, yaw, 0.12);
    }

    if (avatarState !== "lookAtOrb") {
      setAvatarState("lookAtOrb");
    }

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.75) * 0.08;
    }
  });

  return (
    <group ref={rootRef} position={[-1.9, 0.96, 0.72]}>
      <mesh castShadow receiveShadow geometry={bodyGeometry}>
        <meshStandardMaterial color={lowPoly ? "#86a3d6" : "#91b7ff"} roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh ref={headRef} castShadow position={[0, 0.58, 0]} geometry={headGeometry}>
        <meshStandardMaterial color={lowPoly ? "#d8e5ff" : "#edf3ff"} roughness={0.45} metalness={0.05} />
      </mesh>
    </group>
  );
}
