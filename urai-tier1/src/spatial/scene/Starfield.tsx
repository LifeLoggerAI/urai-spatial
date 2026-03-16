'''"use client";
import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { generateStars, Star } from "@/spatial/data/stars";

export default function Starfield() {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const setFocus = useSceneStore((s) => s.setFocus);
  const stars = useMemo(() => generateStars("default_seed"), []);

  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    stars.forEach((star, i) => {
      dummy.position.set(star.position[0], star.position[1], star.position[2]);
      dummy.scale.set(star.scale, star.scale, star.scale);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [stars]);

  const click = (e: any) => {
    const id = e.instanceId;
    if (id == null) return;
    const star = stars[id];
    setFocus(star.id.toString());
  };

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, stars.length]} onClick={click}>
      <sphereGeometry args={[0.7, 8, 8]} />
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
}
'''