#!/usr/bin/env bash
set -euo pipefail

APP="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
AUD="$APP/_audit/tier1-interaction-lock/$TS"
mkdir -p "$AUD"

cp src/spatial/scene/SpatialScene.tsx "$AUD/scene.before.tsx" || true

cat > src/spatial/scene/SpatialScene.tsx <<'EOT'
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Mode = "lifemap" | "focus" | "replay";

type Star = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
};

const STARS: Star[] = Array.from({ length: 60 }, (_, i) => {
  const ring = 2.4 + (i % 6) * 0.55;
  const angle = (i / 60) * Math.PI * 2;
  const height = ((i % 7) - 3) * 0.22;
  return {
    id: `star-${i + 1}`,
    position: [
      Math.cos(angle) * ring,
      height,
      Math.sin(angle) * ring - 2.5,
    ],
    color: i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#c9ddff" : "#ffd98a",
    size: 0.07 + (i % 5) * 0.01,
  };
});

function CameraRig({
  mode,
  selectedStar,
}: {
  mode: Mode;
  selectedStar: Star | null;
}) {
  const refPos = useRef(new THREE.Vector3(0, 0.4, 8));
  const refLook = useRef(new THREE.Vector3(0, 0, -2.5));

  useFrame(({ camera }, delta) => {
    const targetPos = new THREE.Vector3(0, 0.4, 8);
    const targetLook = new THREE.Vector3(0, 0, -2.5);

    if (selectedStar) {
      const [x, y, z] = selectedStar.position;
      if (mode === "focus") {
        targetPos.set(x * 0.45, y + 0.35, z + 1.25);
        targetLook.set(x, y, z);
      } else if (mode === "replay") {
        targetPos.set(x * 0.2, y + 0.12, z + 0.7);
        targetLook.set(x, y, z - 0.08);
      }
    }

    const t = 1 - Math.exp(-delta * 3.2);
    refPos.current.lerp(targetPos, t);
    refLook.current.lerp(targetLook, t);

    camera.position.copy(refPos.current);
    camera.lookAt(refLook.current);
  });

  return null;
}

function StarNode({
  star,
  selected,
  dimmed,
  onClick,
}: {
  star: Star;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 1.2) * 0.08;
    const scale = selected ? 1.9 * pulse : dimmed ? 0.7 : 1.0 * pulse;
    meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.12);
  });

  return (
    <mesh
      ref={meshRef}
      position={star.position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <sphereGeometry args={[star.size, 12, 12]} />
      <meshBasicMaterial color={star.color} transparent opacity={dimmed ? 0.18 : 0.98} />
    </mesh>
  );
}

function HtmlOverlay({
  mode,
  hasSelection,
  onReplay,
  onFocus,
  onHome,
}: {
  mode: Mode;
  hasSelection: boolean;
  onReplay: () => void;
  onFocus: () => void;
  onHome: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        color: "white",
        fontSize: 12,
        zIndex: 20,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span>Tier1 Active</span>
      <span>Mode: {mode}</span>
      <button onClick={onHome}>Home</button>
      {hasSelection && mode !== "focus" && <button onClick={onFocus}>Focus</button>}
      {hasSelection && mode !== "replay" && <button onClick={onReplay}>Replay</button>}
    </div>
  );
}

function SceneContent() {
  const [mode, setMode] = useState<Mode>("lifemap");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedStar = useMemo(
    () => STARS.find((s) => s.id === selectedId) ?? null,
    [selectedId]
  );

  return (
    <>
      <CameraRig mode={mode} selectedStar={selectedStar} />

      <ambientLight intensity={1.1} />
      <pointLight position={[4, 6, 6]} intensity={8} />

      {STARS.map((star) => (
        <StarNode
          key={star.id}
          star={star}
          selected={selectedId === star.id}
          dimmed={!!selectedId && selectedId !== star.id}
          onClick={() => {
            setSelectedId(star.id);
            setMode("focus");
          }}
        />
      ))}

      {selectedStar && mode === "replay" && (
        <mesh position={selectedStar.position}>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshBasicMaterial color="#ff4db8" transparent opacity={0.35} />
        </mesh>
      )}

      <group position={[0, -1.6, -2.5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, 14]} />
          <meshBasicMaterial color="#05070d" />
        </mesh>
      </group>

      <HtmlOverlay
        mode={mode}
        hasSelection={!!selectedStar}
        onReplay={() => setMode("replay")}
        onFocus={() => selectedStar && setMode("focus")}
        onHome={() => {
          setSelectedId(null);
          setMode("lifemap");
        }}
      />
    </>
  );
}

export default function SpatialScene() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#02040a" }}>
      <Canvas camera={{ position: [0, 0.4, 8], fov: 60 }}>
        <SceneContent />
      </Canvas>
    </div>
  );
}
EOT

pnpm build | tee "$AUD/build.log"

echo "DONE → $AUD"
