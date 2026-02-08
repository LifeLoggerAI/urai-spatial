"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { XR, VRButton, ARButton, Controllers, Hands } from "@react-three/xr";
import Starfield from "./Starfield";
import Constellation from "./Constellation";
import Camera from "./Camera";
import { Memory } from "./lib/types";

const memories: Memory[] = [
  {
    id: "1",
    type: "memory",
    name: "First Memory",
    tags: [],
    transform: { position: { x: -2, y: 1, z: -5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    components: [],
    emotionalWeight: 1.2,
    recency: 0.9,
    intensity: 1.5,
    archetype: "insight",
    activeRelevance: true,
    constellationId: "constellation-1",
  },
  {
    id: "2",
    type: "memory",
    name: "Second Memory",
    tags: [],
    transform: { position: { x: 2, y: 2, z: -6 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    components: [],
    emotionalWeight: 0.8,
    recency: 0.5,
    intensity: 1.0,
    archetype: "loss",
    activeRelevance: false,
    constellationId: "constellation-1",
  },
  {
    id: "3",
    type: "memory",
    name: "Third Memory",
    tags: [],
    transform: { position: { x: 0, y: 3, z: -7 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    components: [],
    emotionalWeight: 1.5,
    recency: 0.2,
    intensity: 2.0,
    archetype: "love",
    activeRelevance: true,
    constellationId: "constellation-2",
  },
  {
    id: "4",
    type: "memory",
    name: "Fourth Memory",
    tags: [],
    transform: { position: { x: 1, y: 0, z: -4 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    components: [],
    emotionalWeight: 1.0,
    recency: 0.8,
    intensity: 1.2,
    archetype: "creation",
    activeRelevance: false,
    constellationId: "constellation-2",
  },
];

function groupMemoriesByConstellation(memories: Memory[]): { [key: string]: Memory[] } {
  return memories.reduce((acc, memory) => {
    if (memory.constellationId) {
      if (!acc[memory.constellationId]) {
        acc[memory.constellationId] = [];
      }
      acc[memory.constellationId].push(memory);
    }
    return acc;
  }, {} as { [key: string]: Memory[] });
}

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

export default function XRScene({demo, replay, season, interactionMode}) {
  useEffect(() => {
    console.log({demo, replay, season, interactionMode});
  }, [demo, replay, season, interactionMode]);

  const constellations = groupMemoriesByConstellation(memories);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{ position: "fixed", right: 12, top: 12, zIndex: 10, display: "flex", gap: 8 }}>
        {interactionMode === "vr" ? <VRButton /> : null}
        {interactionMode === "ar" ? <ARButton /> : null}
      </div>

      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <XR>
          <Camera />
          <ambientLight intensity={0.4} />
          <directionalLight position={[4, 6, 2]} intensity={1.0} />
          <Environment preset="night" />
          <Starfield />
          {Object.entries(constellations).map(([constellationId, memories]) => (
            <Constellation key={constellationId} memories={memories} />
          ))}
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
