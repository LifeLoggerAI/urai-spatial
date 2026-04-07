"use client";

import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import CameraRig from "../components/CameraRig";
import GroundWorld from "./GroundWorld";
import HomeWorld from "./HomeWorld";
import Starfield from "./Starfield";
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
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshStandardMaterial
          color="#edf5ff"
          emissive={star.color}
          emissiveIntensity={1.8}
          roughness={0.12}
          metalness={0.05}
          transparent
          opacity={0.76}
        />
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
        <sphereGeometry args={[0.55, 30, 30]} />
        <meshPhysicalMaterial
          color="#f5f9ff"
          emissive={star.color}
          emissiveIntensity={2.4}
          roughness={0.1}
          metalness={0.08}
          transparent
          opacity={0.82}
          transmission={0.18}
          thickness={0.42}
        />
      </mesh>
    </group>
  );
}

function WorldEvents() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const enterGround = useSceneStore((s) => s.enterGround);
  const enterReplay = useSceneStore((s) => s.enterReplay);
  const escape = useSceneStore((s) => s.escape);

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

  return (
    <>
      <color attach="background" args={["#01066d"]} />
      <fogExp2 attach="fog" args={["#02030a", 0.24]} />

      <ambientLight intensity={0.02} />
      <hemisphereLight intensity={0.1} groundColor="#000000" color="#18306b" />

      <directionalLight
        position={[-6.4, 4.2, -7.2]}
        intensity={0.36}
        color="#162247"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <pointLight
        position={[-0.52, 1.24, 0.18]}
        intensity={6.2}
        distance={11.5}
        decay={2}
        color="#71d2ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <CameraRig />
      <GroundWorld />
      <HomeWorld />
      <Starfield />
      <ReplayFocus />
      <ReplayEnvironment />

      {mode === "ground" ? (
        <mesh position={[0, 0.25, -1.4]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#8fd7ff" emissive="#3baeff" emissiveIntensity={0.8} />
        </mesh>
      ) : null}
    </>
  );
}

export default function SpatialScene() {
  return (
    <>
      <WorldEvents />
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [-5.2, 1.25, 6.6], fov: 33, near: 0.1, far: 140 }}
        style={{ width: "100vw", height: "100vh", display: "block" }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </>
  );
}
