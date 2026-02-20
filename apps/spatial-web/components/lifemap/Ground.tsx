"use client";

import { useMemo } from "react";
import * as THREE from "three";

export default function Ground() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(100, 100), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#001122",
        transparent: true,
        opacity: 0.6,
      }),
    []
  );

  const mesh = useMemo(
    () => new THREE.Mesh(geometry, material),
    [geometry, material]
  );

  mesh.position.set(0, -3.5, -2);
  mesh.rotation.set(-Math.PI / 2, 0, 0);

  return <primitive object={mesh} />;
}