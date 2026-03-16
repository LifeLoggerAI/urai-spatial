"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useSceneStore } from "@/spatial/state/sceneStore";

export default function CameraRig() {
  const { camera } = useThree();
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    if (mode === "home") {
      targetPosition.set(0, 120, 240);
      targetLookAt.set(0, 0, 0);
    } else if (mode === "lifemap") {
      targetPosition.set(0, 520, 0.01);
      targetLookAt.set(0, 0, 0);
    } else if (mode === "focus" && selectedStar) {
      const [x, y, z] = selectedStar.position;
      const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(42);
      targetPosition.set(x + dir.x, y + dir.y, z + dir.z);
      targetLookAt.set(x, y, z);
    }

    camera.position.lerp(targetPosition, 0.06);
    camera.lookAt(targetLookAt);
  });

  return null;
}
