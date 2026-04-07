"use client";

import { Canvas } from "@react-three/fiber";
import CameraRig from "../components/CameraRig";
import { useSceneStore } from "../state/sceneStore";
import HomeWorld from "./HomeWorld";
import Starfield from "./Starfield";
import ReplaySphere from "./ReplaySphere";
import GroundWorld from "./GroundWorld";

export default function SpatialScene() {
  const mode = useSceneStore((s) => s.mode);

  return (
    <Canvas camera={{ position: [0, 2, 10], fov: 60 }}>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 5, 5]} intensity={3} />

      <CameraRig />

      {mode === "home" && <HomeWorld />}
      {mode === "lifemap" && <Starfield />}
      {mode === "replay" && <ReplaySphere />}
      {mode === "ground" && <GroundWorld />}
    </Canvas>
  );
}
