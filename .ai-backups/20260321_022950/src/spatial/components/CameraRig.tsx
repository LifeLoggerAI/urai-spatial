"use client";

import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useSceneStore } from "../state/sceneStore";
import * as THREE from "three";

export default function CameraRig() {
  const { camera } = useThree();
  const mode = useSceneStore((s) => s.mode);

  useFrame(() => {
    let target = new THREE.Vector3();

    if (mode === "home") target.set(0, 2.5, 8);
    if (mode === "lifemap") target.set(0, 0, 12);
    if (mode === "replay") target.set(0, 0, 4);

    camera.position.lerp(target, 0.06);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
