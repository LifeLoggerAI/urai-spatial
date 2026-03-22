"use client";
import { useSceneStore } from "../state/sceneStore";

export default function World() {
  const mode = useSceneStore((s) => s.mode);

  return (
    <>
      <color attach="background" args={[mode === "lifemap" ? "#020617" : "#6fa3ff"]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
    </>
  );
}
