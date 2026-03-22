"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();

      if (mode === "replay") {
        exitReplay();
        return;
      }

      if (mode === "object") {
        returnFromObject();
        return;
      }

      if (mode === "lifemap" && selectedStar) {
        clearStarFocus();
        return;
      }

      if (mode === "lifemap" || mode === "ground") {
        returnHome();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.focus();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mode, selectedStar, exitReplay, returnFromObject, clearStarFocus, returnHome]);

  const background = useMemo(
    () =>
      new Color(
        mode === "replay"
          ? "#01040f"
          : mode === "ground" || mode === "object"
            ? "#020e2d"
            : phase === "to-lifemap"
              ? "#01081b"
              : "#020a56",
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
      ? 0.12
      : mode === "ground" || mode === "object"
        ? 0.075
        : phase === "to-lifemap"
          ? 0.045
          : 0.026;

  const starBackdropVisible =
    mode === "lifemap" || mode === "replay" || phase === "to-lifemap" || phase === "to-home";

  return (
    <>
      <color attach="background" args={[background]} />
      <fogExp2 attach="fog" args={[fogColor, fogDensity]} />

      <ambientLight intensity={mode === "replay" ? 0.07 : 0.135} />
      <directionalLight
        position={[4.2, 7.3, 6.2]}
        intensity={mode === "ground" || mode === "object" ? 1.02 : 1.24}
        color="#9abfff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-6.8, 4.6, -10.4]} intensity={0.22} color="#214cff" />
      <pointLight
        position={[-0.6, 1.72, 1.32]}
        intensity={mode === "home" || phase === "to-home" || phase === "to-lifemap" ? 0.82 : 0}
        distance={7.6}
        color="#7aa7ff"
      />
      <spotLight
        position={[0, 7.1, 4.5]}
        angle={0.44}
        penumbra={1}
        intensity={mode === "replay" ? 1.02 : 0.38}
        color="#ebf3ff"
      />

      {starBackdropVisible && (
        <mesh position={[0, 10, -60]}>
          <planeGeometry args={[220, 120]} />
          <meshBasicMaterial color="#02091f" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      )}

      <HomeWorld />
      <GroundWorld />
      <Starfield />
      <ReplaySphere />

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
        frameloop="always"
        dpr={[1, 1.25]}
        performance={{ min: 0.8 }}
        camera={{ position: [1.55, 2.92, 12.0], fov: 47, near: 0.1, far: 240 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true,
        }}
        tabIndex={0}
        onCreated={() => {
          window.focus();
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
