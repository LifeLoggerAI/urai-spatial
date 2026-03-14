"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const COUNT = 80;

export default function Starfield() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < COUNT; i++) {
      const x = ((i * 7.13) % 40) - 20;
      const y = ((i * 11.71) % 20) - 10;
      const z = -((i * 5.39) % 20);

      const scale = 0.12 + ((i * 3.17) % 100) / 1000;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
}