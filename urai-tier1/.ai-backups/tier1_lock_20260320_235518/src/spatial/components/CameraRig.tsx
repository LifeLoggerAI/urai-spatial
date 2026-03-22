"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveStarById } from "../data/stars";

const current = new Vector3();
const target = new Vector3();
const lookAt = new Vector3();
const tmp = new Vector3();

export default function CameraRig() {
  const camera = useThree((state) => state.camera);
  const clock = useThree((state) => state.clock);
  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const selectedObject = useSceneStore((state) => state.selectedObject);

  const homePos = useMemo(() => new Vector3(2.7, 3.4, 11.8), []);
  const homeLook = useMemo(() => new Vector3(0.4, 1.65, 0), []);
  const lifemapPos = useMemo(() => new Vector3(0, 4.1, 9.4), []);
  const lifemapLook = useMemo(() => new Vector3(0, 2.6, -14), []);
  const groundPos = useMemo(() => new Vector3(0, 2.2, 8.3), []);
  const groundLook = useMemo(() => new Vector3(0, 1.2, 0.1), []);
  const objectPos = useMemo(() => new Vector3(0, 2.6, 5.6), []);
  const objectLook = useMemo(() => new Vector3(0, 1.4, -0.5), []);

  useFrame((_, delta) => {
    const t = clock.getElapsedTime();
    const idle = Math.sin(t * 0.37) * 0.075 + Math.cos(t * 0.21) * 0.045;
    const sway = Math.sin(t * 0.24) * 0.18;

    if (mode === "home") {
      target.copy(homePos).add(tmp.set(sway * 0.35, idle, 0));
      lookAt.copy(homeLook).add(tmp.set(-sway * 0.1, idle * 0.1, 0));
    } else if (mode === "lifemap") {
      const star = resolveStarById(selectedStar);
      if (star) {
        target.set(star.position[0] * 0.22, star.position[1] + 0.9, star.position[2] + 3.9);
        lookAt.set(star.position[0] * 0.08, star.position[1], star.position[2] - 0.2);
        target.add(tmp.set(Math.sin(t * 0.9) * 0.05, Math.cos(t * 0.7) * 0.04, 0));
      } else {
        target.copy(lifemapPos).add(tmp.set(sway * 0.15, idle * 0.5, 0));
        lookAt.copy(lifemapLook).add(tmp.set(0, idle * 0.15, 0));
      }
    } else if (mode === "replay") {
      const star = resolveStarById(selectedStar);
      if (star) {
        target.set(star.position[0] * 0.03, star.position[1] + 0.25, star.position[2] + 1.55);
        lookAt.set(star.position[0] * 0.01, star.position[1] + 0.05, star.position[2] - 0.9);
        target.add(tmp.set(Math.sin(t * 0.55) * 0.04, Math.cos(t * 0.48) * 0.03, 0));
      } else {
        target.copy(lifemapPos);
        lookAt.copy(lifemapLook);
      }
    } else if (mode === "ground") {
      target.copy(groundPos).add(tmp.set(sway * 0.22, idle * 0.5, 0.08));
      lookAt.copy(groundLook).add(tmp.set(0, idle * 0.08, 0));
    } else if (mode === "object" && selectedObject) {
      target.copy(objectPos).add(tmp.set(sway * 0.08, idle * 0.25, 0));
      lookAt.copy(objectLook).add(tmp.set(0, idle * 0.05, 0));
    } else {
      target.copy(homePos);
      lookAt.copy(homeLook);
    }

    current.copy(camera.position);
    const damping = mode === "replay" ? 1 - Math.exp(-delta * 3.8) : 1 - Math.exp(-delta * 2.8);
    current.lerp(target, damping);
    camera.position.copy(current);
    camera.lookAt(lookAt);

    camera.fov = MathUtils.lerp(
      camera.fov,
      mode === "replay" ? 36 : mode === "lifemap" && selectedStar ? 44 : mode === "ground" ? 50 : 47,
      1 - Math.exp(-delta * 4.2),
    );
    camera.updateProjectionMatrix();
  });

  return null;
}
