"use client";

import Orb from "../components/Orb";
import PresenceRig from "../components/PresenceRig";
import { useSceneStore } from "../state/sceneStore";
import GroundWorld from "./GroundWorld";
import HomeSky from "./HomeSky";

type HomeOrbEventDetail = {
  event: "home.orb.activate";
  source: "pointer" | "keyboard";
  timestamp: number;
};

function emitHomeOrbEvent(source: HomeOrbEventDetail["source"]) {
  if (typeof window === "undefined") return;
  const detail: HomeOrbEventDetail = {
    event: "home.orb.activate",
    source,
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent<HomeOrbEventDetail>("urai:narrator", { detail }));
}

export default function HomeWorld() {
  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);
  const phase = useSceneStore((s) => s.phase);

  const onActivateOrb = (source: "pointer" | "keyboard") => {
    emitHomeOrbEvent(source);
    enterLifeMap();
  };

  return (
    <group>
      <HomeSky />
      <GroundWorld />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.52, 0.012, -0.05]} receiveShadow>
        <circleGeometry args={[1.1, 36]} />
        <shadowMaterial opacity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.4, 40]} />
        <meshBasicMaterial color="#67c4ff" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <Orb interactive active onClick={onActivateOrb} />

      <PresenceRig visible phase={phase} focusTarget={[-0.52, 0.38, -0.05]} />

      <mesh position={[-4.2, 1.3, -3.2]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 2.6, 0.36]} />
        <meshStandardMaterial color="#04060d" transparent opacity={0.2} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-2.8, 1.6, -5.4]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 3.2, 0.44]} />
        <meshStandardMaterial color="#04060d" transparent opacity={0.16} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[3.4, 1.4, -4.8]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 2.8, 0.4]} />
        <meshStandardMaterial color="#04060d" transparent opacity={0.18} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}