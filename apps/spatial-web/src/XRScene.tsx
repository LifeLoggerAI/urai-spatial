"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { XR, VRButton, ARButton, Controllers, Hands } from "@react-three/xr";
import Starfield from "./Starfield";
import Constellation from "./Constellation";
import NarrativeCamera from "./NarrativeCamera";
import InteractionManager from "./InteractionManager";
import { Memory } from "./lib/types";
import { getMemories } from "../../../lib/memories"; // Import getMemories

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

export default function XRScene({demo, replay, season, interactionMode}) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [proximateId, setProximateId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMemories() {
      try {
        const data = await getMemories(); // Use getMemories
        setMemories(data);
      } catch (error) {
        console.error("Failed to fetch memories:", error);
      }
    }
    fetchMemories();
  }, [demo, replay, season, interactionMode]);

  const constellations = groupMemoriesByConstellation(memories);

  const handleDwell = (id: string) => {
    const memory = memories.find(m => m.id === id);
    if (memory) {
      const resonance = memory.resonance || 0;
      const dwellThreshold = 0.8;

      if (resonance >= dwellThreshold) {
        console.log("spatialMeaningThresholdReached", { memoryId: id });
      }
    }
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{ position: "fixed", right: 12, top: 12, zIndex: 10, display: "flex", gap: 8 }}>
        {interactionMode === "vr" ? <VRButton /> : null}
        {interactionMode === "ar" ? <ARButton /> : null}
      </div>

      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <XR>
          <NarrativeCamera memories={memories} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[4, 6, 2]} intensity={1.0} />
          <Environment preset="night" />
          <Starfield />

          <InteractionManager
            memories={memories}
            onHover={setHoveredId}
            onProximity={setProximateId}
            onDwell={handleDwell}
          />

          {Object.entries(constellations).map(([constellationId, memories]) => (
            <Constellation 
              key={constellationId} 
              memories={memories} 
              hoveredId={hoveredId}
              proximateId={proximateId}
            />
          ))}
          
          <Controllers />
          <Hands />
        </XR>
      </Canvas>
    </div>
  );
}
