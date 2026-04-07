"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import type { Vec3 } from "../types";

const HOME_POS: Vec3 = [-3.2, 1.4, 4.8];
const HOME_TARGET: Vec3 = [0, 1.0, 0];
const GROUND_POS: Vec3 = [-2.4, 1.15, 3.6];
const GROUND_TARGET: Vec3 = [0, 0.42, 0];
const LIFEMAP_POS: Vec3 = [0, 2.4, 7.8];
const LIFEMAP_TARGET: Vec3 = [0, 2.2, -10];
const REPLAY_OFFSET: Vec3 = [0, 0.55, 2.15];

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export function CameraRig() {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 120;
    camera.fov = 38;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(({ clock }, dt) => {
    let targetPos = new THREE.Vector3(...HOME_POS);
    let targetLook = new THREE.Vector3(...HOME_TARGET);
    let targetFov = 36;

    if (mode === "ground") {
      targetPos = new THREE.Vector3(...GROUND_POS);
      targetLook = new THREE.Vector3(...GROUND_TARGET);
      targetFov = 34;
    } else if (mode === "lifemap") {
      targetPos = new THREE.Vector3(...LIFEMAP_POS);
      targetLook = new THREE.Vector3(...LIFEMAP_TARGET);
      targetFov = 32;
      const star = resolveStarById(selectedStar);
      if (star) {
        targetLook = new THREE.Vector3(star.position[0], star.position[1], star.position[2]);
      }
    } else if (mode === "replay") {
      const star = resolveStarById(selectedStar);
      if (star) {
        targetPos = new THREE.Vector3(
          star.position[0] + REPLAY_OFFSET[0],
          star.position[1] + REPLAY_OFFSET[1],
          star.position[2] + REPLAY_OFFSET[2]
        );
        targetLook = new THREE.Vector3(star.position[0], star.position[1], star.position[2]);
        targetFov = 28;
      } else {
        targetPos = new THREE.Vector3(...LIFEMAP_POS);
        targetLook = new THREE.Vector3(...LIFEMAP_TARGET);
        targetFov = 30;
      }
    }

    if (mode === "home") {
      const t = clock.getElapsedTime();
      targetPos.x += Math.sin(t * 0.15) * 0.03;
      targetPos.y += Math.cos(t * 0.12) * 0.02;
      targetLook.y += 0.02;
    }

    camera.position.set(
      damp(camera.position.x, targetPos.x, 4.2, dt),
      damp(camera.position.y, targetPos.y, 4.2, dt),
      damp(camera.position.z, targetPos.z, 4.2, dt)
    );

    const look = new THREE.Vector3();
    look.copy(targetLook);
    camera.lookAt(look);
    camera.fov = damp(camera.fov, targetFov, 4.8, dt);
    camera.updateProjectionMatrix();
  });

  return null;
}

export default CameraRig;
