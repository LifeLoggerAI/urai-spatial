"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import Tier1Lights from "../components/Tier1Lights";
import { Environment } from "@react-three/drei";
import { Color } from "three";
import CameraRig from "../components/CameraRig";
import { useSceneStore } from "../state/sceneStore";
import GroundWorld from "./GroundWorld";
import HomeWorld from "./HomeWorld";
import ReplaySphere from "./ReplaySphere";
import Starfield from "./Starfield";

function SceneContent() {
  const mode = useSceneStore((state) => state.mode);
  const phase = useSceneStore((state) => state.phase);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const enterReplay = useSceneStore((state) => state.enterReplay);
  const exitReplay = useSceneStore((state) => state.exitReplay);
  const returnHome = useSceneStore((state) => state.returnHome);
  const returnFromObject = useSceneStore((state) => state.returnFromObject);
  const clearStarFocus = useSceneStore((state) => state.clearStarFocus);

  const background = useMemo(
    () =>
      new Color(
        mode === "replay"
          ? "#01040f"
          : mode === "ground" || mode === "object"
            ? "#020e2d"
            : phase === "to-lifemap"
              ? "#01081b"
              : "#02103b",
      ),
    [mode, phase],
  );

  const fogColor =
    mode === "replay"
      ? "#020616"
      : mode === "ground" || mode === "object"
        ? "#041746"
        : "#051a59";

  const fogDensity =
    mode === "replay"
      ? 0.13
      : mode === "ground" || mode === "object"
        ? 0.08
        : phase === "to-lifemap"
          ? 0.05
          : 0.032;

  const orbVisible = mode === "home" || phase === "to-home" || phase === "to-lifemap";
  const avatarVisible = mode === "home" || phase === "to-home";
  const starBackdropVisible =
    mode === "lifemap" || mode === "replay" || phase === "to-lifemap" || phase === "to-home";

  return (
    <>
      <color attach="background" args={[background]} />
      <fogExp2 attach="fog" args={[fogColor, fogDensity]} />

      <ambientLight intensity={mode === "replay" ? 0.08 : 0.16} />
      <directionalLight
        position={[5, 7, 8]}
        intensity={mode === "ground" || mode === "object" ? 1.15 : 1.55}
        color="#8fb7ff"
        castShadow
      />
      <directionalLight position={[-8, 5, -10]} intensity={0.36} color="#1e4cff" />
      <pointLight position={[0, 2.2, 1.8]} intensity={orbVisible ? 1.0 : 0.0} color="#7aa7ff" />
      <spotLight
        position={[0, 7, 5]}
        angle={0.42}
        penumbra={1}
        intensity={mode === "replay" ? 1.25 : 0.52}
        color="#e5efff"
      />

      {starBackdropVisible && (
        <mesh position={[0, 10, -60]}>
          <planeGeometry args={[220, 120]} />
          <meshBasicMaterial color="#030b23" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      )}

      <HomeWorld />
      <GroundWorld />
      <Starfield />
      <ReplaySphere />

      {orbVisible && (
        <group position={[0, 1.25, 0.08]}>
          <mesh>
            <sphereGeometry args={[1.05, 48, 48]} />
            <meshPhysicalMaterial
              color="#f7fbff"
              emissive="#8ab2ff"
              emissiveIntensity={0.9}
              roughness={0.08}
              transmission={0.16}
              thickness={0.8}
              clearcoat={1}
              clearcoatRoughness={0.08}
              transparent
              opacity={phase === "to-lifemap" ? 0.12 : 1}
            />
          </mesh>

          <mesh scale={2.55}>
            <sphereGeometry args={[1.05, 48, 48]} />
            <meshBasicMaterial
              color="#7fa6ff"
              transparent
              opacity={phase === "to-lifemap" ? 0.02 : 0.085}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {avatarVisible && (
        <mesh position={[0, 3.25, -3.3]}>
          <capsuleGeometry args={[0.28, 2.7, 10, 18]} />
          <meshStandardMaterial
            color="#184bff"
            emissive="#3b73ff"
            emissiveIntensity={0.4}
            roughness={0.22}
            metalness={0.15}
            transparent
            opacity={phase === "to-lifemap" ? 0.1 : 1}
          />
        </mesh>
      )}

      <Environment preset={mode === "ground" || mode === "object" ? "city" : "night"} />
      <CameraRig />

      <mesh
        visible={mode === "lifemap" && !!selectedStar}
        position={[0, 0, 0]}
        onDoubleClick={(event) => {
          event.stopPropagation();
          enterReplay();
        }}
        onContextMenu={(event) => {
          event.stopPropagation();
          clearStarFocus();
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>

      <mesh
        visible={mode === "replay"}
        position={[0, 0, 0]}
        onDoubleClick={(event) => {
          event.stopPropagation();
          exitReplay();
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>

      <mesh
        visible={mode === "lifemap" && !selectedStar}
        position={[0, 0, 0]}
        onContextMenu={(event) => {
          event.stopPropagation();
          returnHome();
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>

      <mesh
        visible={mode === "ground"}
        position={[0, 0, 0]}
        onContextMenu={(event) => {
          event.stopPropagation();
          returnHome();
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>

      <mesh
        visible={mode === "object" && !!selectedObject}
        position={[0, 0, 0]}
        onContextMenu={(event) => {
          event.stopPropagation();
          returnFromObject();
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>
    </>
  );
}

export default function SpatialScene() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#020a26" }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [2.6, 3.2, 12.4], fov: 49, near: 0.1, far: 240 }}
        gl={{ antialias: true }}
      >
        <Tier1Lights />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
