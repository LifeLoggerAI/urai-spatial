"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  useFrame(() => {
    if (mode === "home") {
      camera.position.set(-5.2, 1.25, 6.6);
      camera.lookAt(-0.6, 1.05, 0);
    } else if (mode === "ground") {
      camera.position.set(-4.6, 0.95, 5.2);
      camera.lookAt(-0.3, 0.2, 0);
    } else if (mode === "lifemap") {
      camera.position.set(0, 2.6, 8.2);
      const star = resolveStarById(selectedStar);
      if (star) {
        camera.lookAt(star.position[0], star.position[1], star.position[2]);
      } else {
        camera.lookAt(0, 2.2, -11);
      }
    } else {
      const star = resolveStarById(selectedStar);
      if (star) {
        camera.position.set(star.position[0] + 0.6, star.position[1] + 0.35, star.position[2] + 2.0);
        camera.lookAt(star.position[0], star.position[1], star.position[2]);
      } else {
        camera.position.set(0, 2.6, 8.2);
        camera.lookAt(0, 2.2, -11);
      }
    }
    camera.fov = mode === "replay" ? 28 : mode === "lifemap" ? 31 : 33;
    camera.updateProjectionMatrix();
  });

  return null;
}
