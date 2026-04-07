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
          color="#edf5ff"
          emissive={star.color}
          emissiveIntensity={2}
          roughness={0.12}
          metalness={0.05}
          transparent
          opacity={0.76}
        />
      </mesh>
      <mesh scale={2.05}>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.1} depthWrite={false} />
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
        <sphereGeometry args={[0.58, 36, 36]} />
        <meshPhysicalMaterial
          color="#f5f9ff"
          emissive={star.color}
          emissiveIntensity={2.8}
          roughness={0.1}
          metalness={0.08}
          transparent
          opacity={0.82}
          transmission={0.22}
          thickness={0.45}
        />
      </mesh>
      <mesh scale={2.3}>
        <sphereGeometry args={[0.58, 18, 18]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.11} depthWrite={false} />
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
        intensity={6.4}
        distance={11.5}
        decay={2}
        color="#71d2ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <pointLight
        position={[-1.2, 0.85, 0.6]}
        intensity={1.3}
        distance={4.5}
        decay={2}
        color="#4ab8ff"
      />

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
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [-4.85, 1.12, 5.95], fov: 34, near: 0.1, far: 140 }}
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
