"use client";

import { Canvas } from "@react-three/fiber";
import Orb from "../components/Orb";
import CameraRig from "../components/CameraRig";

export default function SpatialScene() {
  return (
    <Canvas shadows camera={{ position: [-6.2,1.25,7.2], fov: 30 }}>
      <color attach="background" args={["#020617"]} />
      <fogExp2 attach="fog" args={["#020617", 0.4]} />

      <ambientLight intensity={0.015} />

      <pointLight
        position={[-0.8,1.2,0.2]}
        intensity={7}
        distance={14}
        color="#6fd3ff"
      />

      <directionalLight position={[-5,4,-5]} intensity={0.25} />

      <CameraRig />

      <mesh rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[30,30]} />
        <meshStandardMaterial color="#02040a" />
      </mesh>

      <Orb />

    </Canvas>
  );
}
