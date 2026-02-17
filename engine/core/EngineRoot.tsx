"use client"
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useState, useEffect } from "react";

import CameraRig from "./CameraRig";
import LightingStack from "../render/LightingStack";
import PostPipeline from "../render/PostPipeline";
import HomeScene from "../scenes/HomeScene";
import WarpTunnel from "../scenes/WarpTunnel";
import LifeMapScene from "../scenes/LifeMapScene";

const ChatUI = () => <div style={{position:'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '10px'}}>CHAT UI</div>;

export default function EngineRoot() {
  const [mode, setMode] = useState("home");
  const [isWarping, setIsWarping] = useState(false);

  useEffect(() => {
    if (isWarping) {
      const timer = setTimeout(() => {
        setIsWarping(false);
        setMode("lifemap");
      }, 2800); // Warp duration
      return () => clearTimeout(timer);
    }
  }, [isWarping]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed' }}>
      <Canvas shadows camera={{ position: [0, 0, 3], fov: 45 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <CameraRig mode={mode} isWarping={isWarping} />
        <LightingStack />

        {mode === 'home' && !isWarping && <HomeScene onEnterLifeMap={() => setIsWarping(true)} onEnterChat={() => setMode("chat")} />}
        {isWarping && <WarpTunnel />}
        
        <PostPipeline />
      </Canvas>
      
      {mode === 'lifemap' && <LifeMapScene />}
      {mode === 'chat' && <ChatUI />}
    </div>
  );
}
