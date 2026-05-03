"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { useSceneAuthority } from "@/spatial/hooks/useSceneAuthority";
import { useCanonEsc } from "@/spatial/hooks/useCanonEsc";

function SceneContent() {
const authority = useSceneAuthority();
useCanonEsc(authority.escape);

const background = useMemo(() => {
if (authority.state.phase === "HOME") return "#020611";
if (authority.state.phase === "ASCENT") return "#061126";
if (authority.state.phase === "LIFEMAP") return "#08142b";
if (authority.state.phase === "FOCUS") return "#120a22";
return "#1a0826";
}, [authority.state.phase]);

return (
<> <color attach="background" args={[background]} /> <ambientLight intensity={1} />
<pointLight position={[0, 2, 4]} intensity={20} /> <mesh onClick={authority.beginAscent}>
<sphereGeometry args={[1, 24, 24]} /> <meshStandardMaterial emissive="#cfd8ff" emissiveIntensity={1.5} color="#ffffff" /> </mesh>
</>
);
}

export default function SpatialScene() {
return (
<Canvas camera={{ position: [0, 0, 6], fov: 50 }}> <SceneContent /> </Canvas>
);
}
