"use client";
import { Canvas } from "@react-three/fiber";
import Starfield from "./Starfield";
import { useLifeMapData } from "@/lib/lifemap/useLifeMapData";

// --- PHASE 1: RENDER CORE HARDENING ---

export default function LifeMapCanvas() {
  const { memories, loading, error } = useLifeMapData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data.</div>;

  // Per Phase 5, the scene must render if there are zero stars.
  return (
    <Canvas style={{ background: "#000" }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      {memories.length > 0 && <Starfield stars={memories} />}

    </Canvas>
  );
}
