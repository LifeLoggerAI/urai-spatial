"use client";

import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import CameraRig from "../components/CameraRig";
import HomeWorld from "./HomeWorld";
import { useSceneStore } from "../state/sceneStore";

function LifemapPlaceholder() {
  return (
    <>
      <color attach="background" args={["#020611"]} />
      <fog attach="fog" args={["#020611", 18, 58]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 8, 0]} intensity={1.4} color="#7ea6ff" />
      <Stars
        radius={70}
        depth={40}
        count={3500}
        factor={3.2}
        saturation={0}
        fade
        speed={0.35}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <circleGeometry args={[30, 96]} />
        <meshBasicMaterial color="#040915" transparent opacity={0.72} />
      </mesh>
    </>
  );
}

export default function SpatialScene() {
  const mode = useSceneStore((s) => s.mode);
  const returnHome = useSceneStore((s) => s.returnHome);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050b18", overflow: "hidden" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.85, 8.2], fov: 37, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
      >
        <CameraRig />
        {mode === "home" ? <HomeWorld /> : <LifemapPlaceholder />}
      </Canvas>

      {mode !== "home" ? (
        <button
          onClick={returnHome}
          style={{
            position: "fixed",
            top: 20,
            left: 20,
            zIndex: 20,
            padding: "10px 14px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(8,12,24,0.62)",
            color: "rgba(236,242,255,0.94)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Esc Home
        </button>
      ) : null}
    </div>
  );
}
