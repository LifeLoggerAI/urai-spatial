"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { GROUND_OBJECTS, resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

const current = new Vector3();
const target = new Vector3();
const look = new Vector3();
const temp = new Vector3();

export default function CameraRig() {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const clock = useThree((state) => state.clock);

  const mode = useSceneStore((state) => state.mode);
  const phase = useSceneStore((state) => state.phase);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const selectedObject = useSceneStore((state) => state.selectedObject);

  const homePos = useMemo(() => new Vector3(1.75, 3.0, 11.6), []);
  const homeLook = useMemo(() => new Vector3(-0.38, 1.46, 0.04), []);
  const ascentPos = useMemo(() => new Vector3(0.15, 5.2, 7.3), []);
  const ascentLook = useMemo(() => new Vector3(0.25, 3.65, -10.2), []);
  const lifePos = useMemo(() => new Vector3(0, 4.0, 8.0), []);
  const lifeLook = useMemo(() => new Vector3(0, 2.7, -16.6), []);
  const groundPos = useMemo(() => new Vector3(-0.2, 2.0, 8.7), []);
  const groundLook = useMemo(() => new Vector3(0.1, 1.0, -0.9), []);

  useFrame((_, delta) => {
    const t = clock.getElapsedTime();
    const idleX = Math.sin(t * 0.22) * 0.08;
    const idleY = Math.cos(t * 0.27) * 0.05;

    if (mode === "home") {
      target.copy(homePos).add(temp.set(idleX * 0.45, idleY * 0.28, 0));
      look.copy(homeLook).add(temp.set(idleX * 0.06, idleY * 0.05, 0));
    } else if (phase === "to-lifemap") {
      target.copy(ascentPos).add(temp.set(idleX * 0.06, idleY * 0.05, -1.5));
      look.copy(ascentLook);
    } else if (mode === "lifemap" && !selectedStar) {
      target.copy(lifePos).add(temp.set(idleX * 0.14, idleY * 0.16, 0));
      look.copy(lifeLook).add(temp.set(0, idleY * 0.04, 0));
    } else if (mode === "lifemap" && selectedStar) {
      const star = resolveStarById(selectedStar);
      if (star) {
        target.set(star.position[0] * 0.2, star.position[1] + 0.8, star.position[2] + 4.2);
        look.set(star.position[0] * 0.04, star.position[1] + 0.02, star.position[2] - 0.18);
        target.add(temp.set(Math.sin(t * 0.45) * 0.03, Math.cos(t * 0.55) * 0.03, 0));
      }
    } else if (mode === "replay") {
      const star = resolveStarById(selectedStar);
      if (star) {
        target.set(star.position[0] * 0.015, star.position[1] + 0.14, star.position[2] + 1.4);
        look.set(star.position[0] * 0.008, star.position[1] + 0.02, star.position[2] - 0.8);
      }
    } else if (mode === "ground") {
      target.copy(groundPos).add(temp.set(idleX * 0.16, idleY * 0.1, 0));
      look.copy(groundLook).add(temp.set(0, idleY * 0.04, 0));
    } else if (mode === "object") {
      const obj = GROUND_OBJECTS.find((item) => item.id === selectedObject);
      if (obj) {
        target.set(obj.position[0] * 0.16, obj.position[1] + 0.82, obj.position[2] + 4.15);
        look.set(obj.position[0] * 0.04, obj.position[1], obj.position[2] - 0.14);
      } else {
        target.copy(groundPos);
        look.copy(groundLook);
      }
    }

    const blend =
      mode === "replay"
        ? 1 - Math.exp(-delta * 6.8)
        : phase === "to-lifemap" || phase === "to-home" || phase === "to-ground"
          ? 1 - Math.exp(-delta * 4.4)
          : 1 - Math.exp(-delta * 5.1);

    current.copy(camera.position);
    current.lerp(target, blend);
    camera.position.copy(current);
    camera.lookAt(look);

    camera.fov = MathUtils.lerp(
      camera.fov,
      mode === "replay" ? 35 : mode === "object" ? 39 : phase === "to-lifemap" ? 43 : mode === "lifemap" ? 46 : 48,
      1 - Math.exp(-delta * 5.2),
    );
    camera.updateProjectionMatrix();
  });

  return null;
}
