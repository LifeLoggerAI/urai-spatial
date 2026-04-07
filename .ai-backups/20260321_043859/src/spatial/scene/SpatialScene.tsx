"use client";

import { Canvas } from "@react-three/fiber";
import Orb from "../components/Orb";
import CameraRig from "../components/CameraRig";

export default function SpatialScene() {
  return (
    <Canvas shadows camera={{ position: [-5.5,1.2,6.5], fov: 32 }}>
      <color attach="background" args={["#02061a"]} />
      <fogExp2 attach="fog" args={["#02061a", 0.35]} />

      <ambientLight intensity={0.02} />

      <pointLight
        position={[-0.6,1.2,0.3]}
        intensity={6}
        distance={12}
        color="#6fd3ff"
      />

      <directionalLight
        position={[-5,4,-5]}
        intensity={0.3}
      />

      <CameraRig />

      <mesh rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[20,20]} />
        <meshStandardMaterial color="#02040a" />
      </mesh>

      <Orb />

    </Canvas>
  );
}
