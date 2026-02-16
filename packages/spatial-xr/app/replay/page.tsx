
"use client"

import { useSearchParams } from "next/navigation"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

function CinematicCamera() {
  const { camera } = useThree();
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1, 5),
      new THREE.Vector3(2, 1.5, 3),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-2, 0.5, 3),
      new THREE.Vector3(0, 1, 5),
    ]);
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const position = curve.getPointAt((t / 10) % 1);
    camera.position.copy(position);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function ReplayPage() {
  const params = useSearchParams()
  const id = params.get("id")

  return (
    <div className="w-screen h-screen bg-black">
      <Canvas camera={{ position: [0, 1, 5] }}>
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry args={[2, 1, 0.1]} />
          <meshStandardMaterial />
        </mesh>
        <CinematicCamera />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
