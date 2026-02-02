"use client";

import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Stars } from "@react-three/drei";
import { XR, VRButton, ARButton, Controllers, Hands } from "@react-three/xr";

function Room() {
  return (
    <group>
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 0, -4]}>
        <boxGeometry args={[4, 2.5, 0.2]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}

function Portal({ onEnter }: { onEnter: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, 0.2, -2]} onClick={(e) => { e.stopPropagation(); onEnter(); }}>
      <torusGeometry args={[0.5, 0.08, 24, 96]} />
      <meshStandardMaterial emissiveIntensity={1.5} />
    </mesh>
  );
}

function FloatingLabel({ text }: { text: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    if (ref.current) ref.current.position.y = 1.2 + Math.sin(t) * 0.06;
  });
  return (
    <group ref={ref} position={[0, 1.2, -2]}>
      <mesh>
        <planeGeometry args={[1.8, 0.35]} />
        <meshBasicMaterial transparent opacity={0.08} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.8, 0.35]} />
        <meshBasicMaterial transparent opacity={0.0} />
      </mesh>
      <HtmlText text={text} />
    </group>
  );
}

function HtmlText({ text }: { text: string }) {
  // No DOM overlays in XR; keep minimal by encoding to a texture.
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.font = "bold 64px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(text, c.width/2, c.height/2);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }, [text]);

  return (
    <mesh position={[0, 0, 0.02]}>
      <planeGeometry args={[1.8, 0.35]} />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
}

export default function XRScene() {
  const [mode, setMode] = useState<"none" | "vr" | "ar">("none");

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{ position: "fixed", left: 12, top: 12, zIndex: 10, display: "flex", gap: 8 }}>
        <button onClick={() => setMode("vr")}>Enable VR</button>
        <button onClick={() => setMode("ar")}>Enable AR</button>
        <button onClick={() => setMode("none")}>Disable XR</button>
      </div>

      <div style={{ position: "fixed", right: 12, top: 12, zIndex: 10, display: "flex", gap: 8 }}>
        {mode === "vr" ? <VRButton /> : null}
        {mode === "ar" ? <ARButton /> : null}
      </div>

      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 1.4, 2.8], fov: 60 }}
      >
        <XR>
          <ambientLight intensity={0.4} />
          <directionalLight position={[4, 6, 2]} intensity={1.0} />
          <Environment preset="night" />
          <Stars radius={60} depth={40} count={2500} factor={2} fade />
          <Room />
          <Portal onEnter={() => console.log("ENTER_PORTAL")} />
          <FloatingLabel text="URAI SPATIAL • PORTAL" />
          <Controllers />
          <Hands />
        </XR>
      </Canvas>
    </div>
  );
}
