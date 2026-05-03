"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Props = {
  phase: unknown;
};

const position = new THREE.Vector3(0, 8.8, 24);
const target = new THREE.Vector3(0, 5.2, -54);
const liveTarget = new THREE.Vector3(0, 5.2, -54);

export function LifeMapCameraLock({ phase }: Props) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (String(phase) !== "LIFEMAP") return;

    const damp = 1 - Math.exp(-delta * 4.25);

    camera.position.lerp(position, damp);
    liveTarget.lerp(target, damp);
    camera.lookAt(liveTarget);

    if ("fov" in camera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 46, damp);
    }

    camera.near = 0.1;
    camera.far = 1800;
    camera.updateProjectionMatrix();
  });

  return null;
}
