"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useSceneStore } from "../state/sceneStore";

const HOME_POS = new THREE.Vector3(0, 1.85, 8.2);
const HOME_LOOK = new THREE.Vector3(0, 1.1, 0);
const LIFEMAP_POS = new THREE.Vector3(0, 7.5, 20);
const LIFEMAP_LOOK = new THREE.Vector3(0, 4.5, -8);

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const mode = useSceneStore((s) => s.mode);

  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpMat = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    if (mode === "home") {
      camera.position.copy(HOME_POS);
      camera.lookAt(HOME_LOOK);
    }
  }, [camera, mode]);

  useFrame((_, dt) => {
    if (mode === "lifemap") {
      targetPos.copy(LIFEMAP_POS);
      targetLook.copy(LIFEMAP_LOOK);
    } else {
      const t = performance.now() * 0.00025;
      targetPos.set(
        HOME_POS.x + Math.sin(t) * 0.08,
        HOME_POS.y + Math.sin(t * 1.7) * 0.035,
        HOME_POS.z
      );
      targetLook.set(
        HOME_LOOK.x,
        HOME_LOOK.y + Math.sin(t * 1.3) * 0.015,
        HOME_LOOK.z
      );
    }

    const alpha = 1 - Math.exp(-dt * 2.8);
    camera.position.lerp(targetPos, alpha);

    tmpMat.lookAt(camera.position, targetLook, camera.up);
    tmpQuat.setFromRotationMatrix(tmpMat);
    camera.quaternion.slerp(tmpQuat, alpha);

    camera.updateProjectionMatrix();
  });

  return null;
}
