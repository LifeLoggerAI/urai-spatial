"use client";
import { Canvas } from "@react-three/fiber";
import { useSceneAuthority } from "@/spatial/hooks/useSceneAuthority";
import { useCanonEsc } from "@/spatial/hooks/useCanonEsc";
import { CinematicCameraRig } from "@/spatial/components/CinematicCameraRig";

export default function SpatialScene() {
const a = useSceneAuthority();
useCanonEsc(a.escape);

return ( <Canvas>
<color attach="background" args={["#020611"]} /> <CinematicCameraRig phase={a.state.phase} /> <mesh onClick={a.beginAscent}>
<sphereGeometry args={[1, 16, 16]} /> <meshBasicMaterial color="white" /> </mesh> </Canvas>
);
}
