"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useSceneStore } from "../state/sceneStore";
import * as THREE from "three";

const targets = {
  home: { pos: new THREE.Vector3(0, 1.15, 7.4), look: new THREE.Vector3(0, 1.1, 0) },
  sky: { pos: new THREE.Vector3(0, 1.5, 4.8), look: new THREE.Vector3(0, 1.2, -7) },
  lifemap: { pos: new THREE.Vector3(0, 1.0, 3.8), look: new THREE.Vector3(0, 1.0, -11.5) },
  focus: { pos: new THREE.Vector3(0, 1.0, 2.6), look: new THREE.Vector3(0, 1.0, -9.8) },
  replay: { pos: new THREE.Vector3(0, 1.3, 2.2), look: new THREE.Vector3(0, 1.2, -3.5) },
};

export default function CameraRig() {
  const { camera } = useThree();
  const mode = useSceneStore((s) => s.mode);
  const tmp = new THREE.Vector3();

  useFrame(() => {
    const target = targets[mode] ?? targets.home;
    camera.position.lerp(target.pos, 0.075);
    tmp.copy(target.look);
    camera.lookAt(tmp);
  });

  return null;
}
