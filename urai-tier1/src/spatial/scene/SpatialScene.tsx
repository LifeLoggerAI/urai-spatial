"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSceneStore } from "../state/sceneStore";
import type { SpatialStar } from "../data/stars";

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function CameraRig() {
  const { mode, selectedStar, modeEnteredAt, finishAscend, finishDescend, finishPullback } = useSceneStore();
  const pos = useRef(new THREE.Vector3(0, 1.6, 11));
  const look = useRef(new THREE.Vector3(0, 0.2, -2.5));

  useFrame(({ camera }, delta) => {
    const targetPos = new THREE.Vector3(0, 1.6, 11);
    const targetLook = new THREE.Vector3(0, 0.2, -2.5);
    const age = Date.now() - modeEnteredAt;

    if (mode === "home") {
      const breathe = Math.sin(Date.now() * 0.0012) * 0.08;
      targetPos.set(0, 1.82 + breathe, 12.2);
      targetLook.set(0, 0.35, -1.4);
    }

    if (mode === "ascend") {
      const rawT = Math.min(1, age / 1100);
      const t = easeInOut(rawT);
      targetPos.set(0, 1.8 - t * 1.4, 12.2 - t * 4.2);
      targetLook.set(0, 0.35 - t * 0.2, -1.4 - t * 1.2);
      if (rawT >= 1) {
        finishAscend();
      }
    }

    if (mode === "lifemap") {
      const drift = Math.sin(Date.now() * 0.0006) * 0.15;
      targetPos.set(drift, 0.46, 8);
      targetLook.set(0, 0, -2.5);
    }

    if (selectedStar && mode === "focus") {
      const [x, y, z] = selectedStar.position;
      targetPos.set(x * 0.34, y + 0.24, z + 1.75);
      targetLook.set(x, y, z);
    }

    if (selectedStar && mode === "replay") {
      const [x, y, z] = selectedStar.position;
      const wobble = Math.sin(Date.now() * 0.0017) * 0.10;
      targetPos.set(x * 0.10 + wobble, y + 0.02, z + 1.05);
      targetLook.set(x, y - 0.02, z - 0.16);
    }
    
    if (mode === "pullback") {
        const rawT = Math.min(1, age / 900);
        const t = easeInOut(rawT);
        if (selectedStar) {
            const [x, y, z] = selectedStar.position;
            const startPos = new THREE.Vector3(x * 0.10, y + 0.02, z + 1.05);
            const startLook = new THREE.Vector3(x, y - 0.02, z - 0.16);
            const endPos = new THREE.Vector3(0, 0.46, 8);
            const endLook = new THREE.Vector3(0, 0, -2.5);
            targetPos.lerpVectors(startPos, endPos, t);
            targetLook.lerpVectors(startLook, endLook, t);
        }
        if(rawT >= 1) {
            finishPullback();
        }
    }

    if (mode === "descend_home") {
      const rawT = Math.min(1, age / 900);
      const t = easeInOut(rawT);
      targetPos.set(0, 0.4 + t * 1.4, 8 + t * 4.2);
      targetLook.set(0, 0 + t * 0.35, -2.5 + t * 1.1);
       if (rawT >= 1) {
        finishDescend();
      }
    }

    const lerpT = 1 - Math.exp(-delta * 3.5);
    pos.current.lerp(targetPos, lerpT);
    look.current.lerp(targetLook, lerpT);

    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });

  return null;
}

function StarNode({
  star,
  selected,
  dimmed,
  onSelect,
  globalFade,
}: {
  star: SpatialStar;
  selected: boolean;
  dimmed: boolean;
  globalFade: number;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 1.3 + star.size * 10) * 0.06;
    const scale = selected ? 2.35 * pulse : dimmed ? 0.72 : 1.0 * pulse;
    ref.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.12);
  });

  return (
    <mesh
      ref={ref}
      position={star.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <sphereGeometry args={[star.size, 12, 12]} />
      <meshBasicMaterial color={star.color} transparent opacity={dimmed ? 0.02 : 1.0 - globalFade} />
    </mesh>
  );
}

function SceneContent() {
    const { mode, stars, selectedStar, selectStar } = useSceneStore();
 
    const dimOthers = mode === "focus" || mode === "replay";
    const globalFade = mode === "focus" ? 0.72 : mode === "replay" ? 0.88 : 0;
    const showGround = mode === 'home' || mode === 'ascend' || mode === 'descend_home';

    return (
    <>
      <CameraRig />

      <ambientLight
        intensity={
          mode === "replay"
            ? 0.35
            : mode === "focus"
            ? 0.55
            : 1.05
        }
      />
      <pointLight position={[4, 6, 6]} intensity={mode === "replay" ? 10 : 8} />
      <fog
        attach="fog"
        args={[
          mode === "replay" ? "#18031f" : mode === "focus" ? "#02030a" : "#02040a",
          mode === "replay" ? 2.0 : mode === "focus" ? 3.8 : 6,
          18
        ]}
      />

      {stars.map((star) => (
        <StarNode
          key={star.id}
          star={star}
          selected={selectedStar?.id === star.id}
          dimmed={dimOthers && selectedStar?.id !== star.id}
          globalFade={globalFade}
          onSelect={() => {
            selectStar(star);
          }}
        />
      ))}

      {selectedStar && mode === "replay" && (
        <mesh position={selectedStar.position}>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshBasicMaterial color="#ff4db8" transparent opacity={0.35} />
        </mesh>
      )}

      {showGround && (
          <group>
            <group position={[0, -1.6, -2.5]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[14, 14]} />
                <meshBasicMaterial color={mode === "replay" ? "#04040a" : "#05070d"} />
                </mesh>
            </group>

            <mesh position={[0, 0.25, -1.4]}>
                <sphereGeometry args={[0.14, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
        </group>
      )}
    </>
  );
}


export default function SpatialScene() {
  // This is a placeholder for scene interaction.
  // In a real scenario, this would be driven by user input.
  useEffect(() => {
    const { ascend, descend, enterReplay, exitReplay, clearFocus } = useSceneStore.getState();
    const handleKeyDown = (e: KeyboardEvent) => {
        const hasSelection = !!useSceneStore.getState().selectedStar;
        const mode = useSceneStore.getState().mode;

        if (e.key === 'e') ascend();
        if (e.key === 'h') descend();
        if (e.key === 'r' && hasSelection) enterReplay();
        if (e.key === 'f' && hasSelection) clearFocus();
        if (e.key === 'x' && mode === 'replay') exitReplay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#02040a", position: "relative" }}>
      <Canvas camera={{ position: [0, 1.6, 11], fov: 60 }}>
        <SceneContent />
      </Canvas>
    </div>
  );
}
