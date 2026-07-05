"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useState } from "react";
import { useUniverseStream } from "../../hooks/useUniverseStream";
import UniverseNodeCloud from "./UniverseNodeCloud";
import UniverseTelemetryPanel from "./UniverseTelemetryPanel";
import XRInspectorPanel from "./XRInspectorPanel";
import UniverseCausalLinks from "./UniverseCausalLinks";

export default function XRUniverseRoom() {
  const state = useUniverseStream();
  const [selected, setSelected] = useState<any>(null);

  return (
    <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
      <color attach="background" args={["#050814"]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[5, 8, 5]} intensity={1.5} />

      <gridHelper args={[20, 20]} />
      <axesHelper args={[3]} />

      <Text position={[0, 3, 0]} fontSize={0.35}>
        URAI XR CONTROL ROOM
      </Text>

      <UniverseCausalLinks state={state} />
      <UniverseNodeCloud state={state} onSelect={setSelected} />
      <UniverseTelemetryPanel state={state} />
      <XRInspectorPanel selected={selected} />

      <OrbitControls />
    </Canvas>
  );
}