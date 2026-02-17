"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

export default function SpaceFog() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.Fog("#000000", 20, 120);
  }, [scene]);

  return null;
}
