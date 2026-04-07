"use client";

import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import HomeWorld from "./HomeWorld";
import GroundWorld from "./GroundWorld";
import Starfield from "./Starfield";
import CameraRig from "../components/CameraRig";
import { resolveStarById } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

function ReplayFocus() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const enterReplay = useSceneStore((s) => s.enterReplay);

  if (mode !== "lifemap" || !selectedStar) return null;

  const star = resolveStarById(selectedStar);
  if (!star) return null;

  return (
    <group position={star.position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          enterReplay(star.id);
        }}
      >
        <sphereGeometry args={[0.42, 28, 28]} />
        <meshStandardMaterial
          color="#e9f3ff"
          emissive={star.color}
          emissiveIntensity={1.8}
          roughness={0.16}
          metalness={0.05}
          transparent
          opacity={0.72}
        />
      </mesh>
      <mesh scale={1.9}>
        <sphereGeometry args={[0.42, 22, 22]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ReplayEnvironment() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  if (mode !== "replay") return null;
  const star = resolveStarById(selectedStar);
  if (!star) return null;

  return (
    <group position={star.position}>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshPhysicalMaterial
          color="#f4f8ff"
          emissive={star.color}
          emissiveIntensity={2.4}
          roughness={0.14}
          metalness={0.08}
          transparent
          opacity={0.78}
          transmission={0.2}
          thickness={0.45}
        />
      </mesh>
      <mesh scale={2.2}>
        <sphereGeometry args={[0.55, 18, 18]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function WorldEvents() {
  const mode = useSceneStore((s) => s.mode);
  const enterGround = useSceneStore((s) => s.enterGround);
  const escape = useSceneStore((s) => s.escape);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const enterReplay = useSceneStore((s) => s.enterReplay);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        escape();
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && mode === "lifemap" && selectedStar) {
        e.preventDefault();
        enterReplay(selectedStar);
        return;
      }
      if (e.key.toLowerCase() === "g" && mode === "home") {
        e.preventDefault();
        enterGround();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escape, enterGround, enterReplay, mode, selectedStar]);

  return null;
}

function SceneContent() {
  const mode = useSceneStore((s) => s.mode);
  const returnHome = useSceneStore((s) => s.returnHome);

  return (
    <>
      <color attach="background" args={["#02089b"]} />
      <fogExp2 attach="fog" args={["#02030a", 0.18]} />

      <ambientLight intensity={0.05} />
      <hemisphereLight intensity={0.25} groundColor="#000000" />
      <directionalLight position={[-5, 3, -6]} intensity={0.6} color="#1e2a5a" castShadow />
      <pointLight position={[0, 1.1, 0]} intensity={3.5} distance={10} decay={2} color="#6fd3ff" castShadow />

      <CameraRig />

      <group
        onClick={() => {
          if (mode === "ground") returnHome();
        }}
      >
        <GroundWorld />
        <HomeWorld />
        <Starfield />
        <ReplayFocus />
        <ReplayEnvironment />
      </group>
    </>
  );
}

export function SpatialScene() {
  return (
    <>
      <WorldEvents />
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [-3.2, 1.4, 4.8], fov: 38, near: 0.1, far: 120 }}
        style={{ width: "100vw", height: "100vh", display: "block" }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </>
  );
}

export default SpatialScene;
