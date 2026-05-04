"use client";

import Orb from "../components/Orb";
import { useSceneStore } from "../state/sceneStore";
import GroundWorld from "./GroundWorld";
import { getGroundChannelsForPhase } from "./phaseMachine";

type HomeWorldProps = {
  phase?: string;
  progress?: number;
  reducedMotion?: boolean;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

export default function HomeWorld({ phase = "HOME", progress = 0, reducedMotion = false }: HomeWorldProps) {
  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);
  const channels = getGroundChannelsForPhase(phase, progress);

  const groundVisual = reducedMotion
    ? {
        recession: easeOutCubic(channels.recession),
        elevation: easeOutCubic(channels.elevation),
        opacity: easeOutCubic(channels.opacity),
      }
    : channels;

  return (
    <group>
      <GroundWorld recession={groundVisual.recession} elevation={groundVisual.elevation} opacity={groundVisual.opacity} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.52, 0.012, -0.05]} receiveShadow>
        <circleGeometry args={[1.1, 36]} />
        <shadowMaterial opacity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.4, 40]} />
        <meshBasicMaterial color="#67c4ff" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <Orb interactive active onClick={enterLifeMap} />

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
