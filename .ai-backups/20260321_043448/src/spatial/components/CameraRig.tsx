"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";
import type { Vec3 } from "../types";

const HOME_POS: Vec3 = [-4.85, 1.12, 5.95];
const HOME_TARGET: Vec3 = [-0.25, 0.92, 0];
const GROUND_POS: Vec3 = [-3.45, 0.92, 4.35];
const GROUND_TARGET: Vec3 = [-0.15, 0.34, 0.15];
const LIFEMAP_POS: Vec3 = [-0.45, 2.8, 8.6];
const LIFEMAP_TARGET: Vec3 = [0, 2.25, -10.6];
const REPLAY_OFFSET: Vec3 = [0.62, 0.38, 2.0];

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export function CameraRig() {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 140;
    camera.fov = 34;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(({ clock }, dt) => {
    let targetPos = new THREE.Vector3(...HOME_POS);
    let targetLook = new THREE.Vector3(...HOME_TARGET);
    let targetFov = 33;

    if (mode === "ground") {
      targetPos = new THREE.Vector3(...GROUND_POS);
      targetLook = new THREE.Vector3(...GROUND_TARGET);
      targetFov = 31;
    } else if (mode === "lifemap") {
      targetPos = new THREE.Vector3(...LIFEMAP_POS);
      targetLook = new THREE.Vector3(...LIFEMAP_TARGET);
      targetFov = 30;
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
        targetFov = 27;
      } else {
        targetPos = new THREE.Vector3(...LIFEMAP_POS);
        targetLook = new THREE.Vector3(...LIFEMAP_TARGET);
        targetFov = 30;
      }
    }

    if (mode === "home") {
      const t = clock.getElapsedTime();
      targetPos.x += Math.sin(t * 0.16) * 0.045;
      targetPos.y += Math.cos(t * 0.12) * 0.022;
      targetPos.z += Math.sin(t * 0.08) * 0.03;
      targetLook.x += Math.sin(t * 0.11) * 0.02;
      targetLook.y += Math.cos(t * 0.09) * 0.015;
    }

    camera.position.set(
      damp(camera.position.x, targetPos.x, 4.5, dt),
      damp(camera.position.y, targetPos.y, 4.5, dt),
      damp(camera.position.z, targetPos.z, 4.5, dt)
    );

    camera.lookAt(targetLook);
    camera.fov = damp(camera.fov, targetFov, 5.2, dt);
    camera.updateProjectionMatrix();
  });

  return null;
}

export default CameraRig;
