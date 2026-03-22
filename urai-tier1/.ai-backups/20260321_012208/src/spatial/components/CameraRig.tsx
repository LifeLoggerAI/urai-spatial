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

  const homePos = useMemo(() => new Vector3(2.6, 3.15, 12.6), []);
  const homeLook = useMemo(() => new Vector3(0.2, 1.5, 0.1), []);
  const ascentPos = useMemo(() => new Vector3(0.35, 5.4, 7.2), []);
  const ascentLook = useMemo(() => new Vector3(0, 3.5, -9.5), []);
  const lifePos = useMemo(() => new Vector3(0, 4.2, 8.15), []);
  const lifeLook = useMemo(() => new Vector3(0, 2.8, -16.2), []);
  const groundPos = useMemo(() => new Vector3(0, 2.15, 8.75), []);
  const groundLook = useMemo(() => new Vector3(0, 1.08, -0.7), []);

  useFrame((_, delta) => {
    const t = clock.getElapsedTime();
    const idleX = Math.sin(t * 0.23) * 0.12;
    const idleY = Math.cos(t * 0.31) * 0.08;

    if (mode === "home") {
      target.copy(homePos).add(temp.set(idleX * 0.65, idleY * 0.4, 0));
      look.copy(homeLook).add(temp.set(-idleX * 0.1, idleY * 0.08, 0));
    } else if (phase === "to-lifemap") {
      target.copy(ascentPos).add(temp.set(idleX * 0.12, idleY * 0.12, -1.8));
      look.copy(ascentLook);
    } else if (mode === "lifemap" && !selectedStar) {
      target.copy(lifePos).add(temp.set(idleX * 0.25, idleY * 0.35, 0));
      look.copy(lifeLook).add(temp.set(0, idleY * 0.06, 0));
    } else if (mode === "lifemap" && selectedStar) {
      const star = resolveStarById(selectedStar);
      if (star) {
        target.set(star.position[0] * 0.24, star.position[1] + 0.9, star.position[2] + 4.8);
        look.set(star.position[0] * 0.05, star.position[1] + 0.02, star.position[2] - 0.2);
        target.add(temp.set(Math.sin(t * 0.5) * 0.05, Math.cos(t * 0.6) * 0.04, 0));
      }
    } else if (mode === "replay") {
      const star = resolveStarById(selectedStar);
      if (star) {
        target.set(star.position[0] * 0.02, star.position[1] + 0.18, star.position[2] + 1.7);
        look.set(star.position[0] * 0.01, star.position[1] + 0.02, star.position[2] - 0.8);
        target.add(temp.set(Math.sin(t * 0.4) * 0.03, Math.cos(t * 0.35) * 0.03, 0));
      }
    } else if (mode === "ground") {
      target.copy(groundPos).add(temp.set(idleX * 0.35, idleY * 0.25, 0));
      look.copy(groundLook).add(temp.set(0, idleY * 0.08, 0));
    } else if (mode === "object") {
      const objectNode = GROUND_OBJECTS.find((item) => item.id === selectedObject);
      if (objectNode) {
        target.set(objectNode.position[0] * 0.2, objectNode.position[1] + 0.9, objectNode.position[2] + 4.55);
        look.set(objectNode.position[0] * 0.05, objectNode.position[1], objectNode.position[2] - 0.2);
      } else {
        target.copy(groundPos);
        look.copy(groundLook);
      }
    }

    const blend =
      mode === "replay"
        ? 1 - Math.exp(-delta * 4.4)
        : phase === "to-lifemap" || phase === "to-home" || phase === "to-ground"
          ? 1 - Math.exp(-delta * 2.35)
          : 1 - Math.exp(-delta * 3.15);

    current.copy(camera.position);
    current.lerp(target, blend);
    camera.position.copy(current);
    camera.lookAt(look);

    camera.fov = MathUtils.lerp(
      camera.fov,
      mode === "replay" ? 34 : mode === "object" ? 38 : phase === "to-lifemap" ? 42 : mode === "lifemap" ? 46 : 49,
      1 - Math.exp(-delta * 4.2),
    );
    camera.updateProjectionMatrix();
  });

  return null;
}
