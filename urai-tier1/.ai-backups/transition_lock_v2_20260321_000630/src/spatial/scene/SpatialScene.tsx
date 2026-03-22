"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import { Color, FogExp2 } from "three";
import CameraRig from "../components/CameraRig";
import Starfield from "./Starfield";
import GroundWorld from "./GroundWorld";
import ReplaySphere from "./ReplaySphere";
import { useSceneStore } from "../state/sceneStore";

function SceneContent() {
  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const goLifemap = useSceneStore((state) => state.goLifemap);
  const goGround = useSceneStore((state) => state.goGround);
  const returnHome = useSceneStore((state) => state.returnHome);
  const enterReplay = useSceneStore((state) => state.enterReplay);
  const exitReplay = useSceneStore((state) => state.exitReplay);
  const selectObject = useSceneStore((state) => state.selectObject);

  const background = useMemo(() => new Color(mode === "replay" ? "#020716" : "#02103a"), [mode]);

  return (
    <>
      <primitive object={new FogExp2(mode === "replay" ? "#040818" : "#04124f", mode === "lifemap" ? 0.028 : 0.05)} attach="fog" />
      <color attach="background" args={[background]} />

      <ambientLight intensity={0.16} />
      <directionalLight position={[5, 7, 8]} intensity={1.45} color="#8fb7ff" castShadow />
      <directionalLight position={[-8, 5, -10]} intensity={0.35} color="#1e4cff" />
      <pointLight position={[0, 2.1, 2.2]} intensity={mode === "ground" || mode === "object" ? 0 : 0.95} color="#78a8ff" />
      <spotLight
        position={[0, 6, 6]}
        angle={0.42}
        penumbra={0.9}
        intensity={mode === "replay" ? 1.15 : 0.48}
        color="#dfe8ff"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[18, 72]} />
        <meshStandardMaterial
          color={mode === "ground" || mode === "object" ? "#082ba3" : "#06195d"}
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>

      {(mode === "home" || mode === "lifemap") && (
        <>
          <Float speed={1.15} rotationIntensity={0.09} floatIntensity={0.18}>
            <group position={[0, 1.2, 0.1]}>
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  if (mode === "home") goLifemap();
                }}
              >
                <sphereGeometry args={[1.05, 48, 48]} />
                <meshPhysicalMaterial
                  color="#f6fbff"
                  emissive="#9ec0ff"
                  emissiveIntensity={0.85}
                  roughness={0.08}
                  transmission={0.18}
                  thickness={0.8}
                  clearcoat={1}
                  clearcoatRoughness={0.08}
                />
              </mesh>
              <mesh scale={2.4}>
                <sphereGeometry args={[1.05, 48, 48]} />
                <meshBasicMaterial color="#7ea5ff" transparent opacity={0.08} depthWrite={false} />
              </mesh>
            </group>
          </Float>

          <mesh position={[0, 3.3, -3.4]}>
            <capsuleGeometry args={[0.28, 2.7, 10, 18]} />
            <meshStandardMaterial color="#184bff" emissive="#3b73ff" emissiveIntensity={0.38} roughness={0.22} metalness={0.15} />
          </mesh>
        </>
      )}

      {mode === "home" && (
        <>
          <mesh position={[-4.7, 1.2, -6]}>
            <coneGeometry args={[0.42, 2.5, 5]} />
            <meshStandardMaterial color="#071736" roughness={1} metalness={0} />
          </mesh>
          <mesh position={[5.4, 1.8, -5.4]}>
            <boxGeometry args={[0.9, 3.2, 0.9]} />
            <meshStandardMaterial color="#071530" roughness={1} metalness={0} />
          </mesh>
        </>
      )}

      <Starfield />
      <ReplaySphere />
      <GroundWorld />

      <Environment preset="night" />

      <CameraRig />

      <group
        visible={mode === "home"}
        onClick={(e) => {
          e.stopPropagation();
          const x = e.point.x;
          if (x < -0.6) goGround();
          else goLifemap();
        }}
      >
        <mesh position={[-5, 4.4, -11]}>
          <planeGeometry args={[8, 6]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <mesh position={[5, 4.4, -11]}>
          <planeGeometry args={[8, 6]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      <mesh
        visible={mode === "lifemap" && !!selectedStar}
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (selectedStar) enterReplay(selectedStar);
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>

      <mesh
        visible={mode === "replay"}
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          exitReplay();
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>

      <mesh
        visible={mode === "object"}
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectObject(null);
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>

      <mesh
        visible={mode !== "home"}
        position={[0, 0, 0]}
        onContextMenu={(e) => {
          e.stopPropagation();
          returnHome();
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
        camera={{ position: [2.7, 3.4, 11.8], fov: 47, near: 0.1, far: 240 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
