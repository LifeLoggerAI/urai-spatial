"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import { MathUtils, Vector3 } from "three";
import { useSceneStore, type AvatarState } from "../state/sceneStore";

const STATE_TARGETS: Record<AvatarState, { position: [number, number, number]; opacity: number }> = {
  "hidden": { position: [-0.5, 0.4, -0.6], opacity: 0 },
  "idle-home": { position: [-0.52, 0.24, -0.12], opacity: 1 },
  "entering-lifemap": { position: [-0.42, 0.95, -0.9], opacity: 0.74 },
  "returning-home": { position: [-0.5, 0.38, -0.5], opacity: 0.25 },
};

export default function AvatarRig() {
  const root = useRef<Group>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const avatarState = useSceneStore((s) => s.avatarState);
  const cameraLookTarget = useSceneStore((s) => s.cameraLookTarget);

  useFrame((_, dt) => {
    const group = root.current;
    if (!group) return;

    const target = STATE_TARGETS[avatarState];
    group.position.lerp(new Vector3(...target.position), 1 - Math.exp(-5 * dt));

    const look = new Vector3(...cameraLookTarget);
    group.lookAt(look);

    if (materialRef.current) {
      materialRef.current.transparent = true;
      materialRef.current.opacity = MathUtils.lerp(materialRef.current.opacity, target.opacity, 1 - Math.exp(-8 * dt));
    }
  }, 0);

  return (
    <group ref={root}>
      <group>
        <mesh castShadow>
          <capsuleGeometry args={[0.08, 0.28, 8, 14]} />
          <meshStandardMaterial ref={materialRef} color="#e8f0ff" emissive="#314670" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}
