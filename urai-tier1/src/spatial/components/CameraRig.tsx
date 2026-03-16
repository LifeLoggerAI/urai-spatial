"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useSceneStore } from "@/spatial/state/sceneStore";

export default function CameraRig() {
  const { camera } = useThree();
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const targetPosition = useMemo(() => new THREE.Vector3(0, 120, 240), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const currentLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    if (mode === "home") {
      targetPosition.set(0, 120, 240);
      targetLookAt.set(0, 0, 0);
    } else if (mode === "lifemap") {
      targetPosition.set(0, 520, 0.01);
      targetLookAt.set(0, 0, 0);
    } else if (mode === "focus" && selectedStar) {
      const [x, y, z] = selectedStar.position;
      const starVec = new THREE.Vector3(x, y, z);
      const dir = starVec.clone().normalize();

      const distance = Math.max(52, selectedStar.size * 18);
      targetPosition.copy(starVec).add(dir.multiplyScalar(distance));
      targetLookAt.copy(starVec);
    }

    camera.position.lerp(targetPosition, 0.055);
    currentLookAt.lerp(targetLookAt, 0.08);
    camera.lookAt(currentLookAt);
  });

  return null;
}
