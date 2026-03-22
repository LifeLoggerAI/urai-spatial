"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { useMemo } from "react";
import { useSceneStore } from "../state/sceneStore";
import { resolveStarById, GROUND_OBJECTS } from "../data/stars";

const p = new Vector3();
const l = new Vector3();
const tmp = new Vector3();

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const clock = useThree((s) => s.clock);

  const mode = useSceneStore((s) => s.mode);
  const phase = useSceneStore((s) => s.phase);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const selectedObject = useSceneStore((s) => s.selectedObject);

  const homePos = useMemo(() => new Vector3(2.6, 3.2, 12.4), []);
  const homeLook = useMemo(() => new Vector3(0.2, 1.6, 0), []);
  const ascentPos = useMemo(() => new Vector3(0.4, 5.4, 7.1), []);
  const ascentLook = useMemo(() => new Vector3(0, 3.6, -9), []);
  const lifePos = useMemo(() => new Vector3(0, 4.2, 8.2), []);
  const lifeLook = useMemo(() => new Vector3(0, 2.8, -16), []);
  const groundPos = useMemo(() => new Vector3(0, 2.2, 8.6), []);
  const groundLook = useMemo(() => new Vector3(0, 1.1, -0.6), []);

  useFrame((_, delta) => {
    const t = clock.getElapsedTime();
    const idleX = Math.sin(t * 0.23) * 0.12;
    const idleY = Math.cos(t * 0.31) * 0.08;

    if (mode === "home") {
      p.copy(homePos).add(tmp.set(idleX * 0.65, idleY * 0.4, 0));
      l.copy(homeLook).add(tmp.set(-idleX * 0.1, idleY * 0.1, 0));
    } else if (phase === "to-lifemap") {
      p.copy(ascentPos).add(tmp.set(idleX * 0.15, idleY * 0.12, -1.8));
      l.copy(ascentLook);
    } else if (mode === "lifemap" && !selectedStar) {
      p.copy(lifePos).add(tmp.set(idleX * 0.25, idleY * 0.35, 0));
      l.copy(lifeLook).add(tmp.set(0, idleY * 0.06, 0));
    } else if (mode === "lifemap" && selectedStar) {
      const star = resolveStarById(selectedStar);
      if (star) {
        p.set(star.position[0] * 0.24, star.position[1] + 0.9, star.position[2] + 4.8);
        l.set(star.position[0] * 0.05, star.position[1] + 0.02, star.position[2] - 0.2);
        p.add(tmp.set(Math.sin(t * 0.5) * 0.05, Math.cos(t * 0.6) * 0.04, 0));
      }
    } else if (mode === "replay") {
      const star = resolveStarById(selectedStar);
      if (star) {
        p.set(star.position[0] * 0.02, star.position[1] + 0.18, star.position[2] + 1.7);
        l.set(star.position[0] * 0.01, star.position[1] + 0.02, star.position[2] - 0.8);
        p.add(tmp.set(Math.sin(t * 0.4) * 0.03, Math.cos(t * 0.35) * 0.03, 0));
      }
    } else if (mode === "ground") {
      p.copy(groundPos).add(tmp.set(idleX * 0.35, idleY * 0.25, 0));
      l.copy(groundLook).add(tmp.set(0, idleY * 0.08, 0));
    } else if (mode === "object") {
      const obj = GROUND_OBJECTS.find((o) => o.id === selectedObject);
      if (obj) {
        p.set(obj.position[0] * 0.2, obj.position[1] + 0.9, obj.position[2] + 4.6);
        l.set(obj.position[0] * 0.05, obj.position[1], obj.position[2] - 0.2);
      } else {
        p.copy(groundPos);
        l.copy(groundLook);
      }
    }

    const alpha =
      mode === "replay"
        ? 1 - Math.exp(-delta * 4.4)
        : phase === "to-lifemap" || phase === "to-home" || phase === "to-ground"
          ? 1 - Math.exp(-delta * 2.35)
          : 1 - Math.exp(-delta * 3.15);

    camera.position.lerp(p, alpha);
    camera.lookAt(l);
    camera.fov = MathUtils.lerp(
      camera.fov,
      mode === "replay" ? 34 : mode === "object" ? 38 : phase === "to-lifemap" ? 42 : mode === "lifemap" ? 46 : 49,
      1 - Math.exp(-delta * 4.2),
    );
    camera.updateProjectionMatrix();
  });

  return null;
}
