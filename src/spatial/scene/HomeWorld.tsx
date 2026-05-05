"use client";

import { useCallback } from "react";

import Orb from "../components/Orb";
import { useSceneStore } from "../state/sceneStore";

function emitHomeEvent(event: string, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("urai:narrator", { detail: { event, ...detail, timestamp: Date.now() } }));
}

export default function HomeWorld() {
  const phase = useSceneStore((s) => s.phase);
  const homeSubstate = useSceneStore((s) => s.homeSubstate);
  const focusHomeOrb = useSceneStore((s) => s.focusHomeOrb);
  const confirmHomeEntry = useSceneStore((s) => s.confirmHomeEntry);
  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);

  const handleFocusOrb = useCallback(() => {
    if (phase !== "HOME") return;
    focusHomeOrb();
    emitHomeEvent("home.orb.focus", { substate: "home_orb_focus" });
    emitHomeEvent("home.entry.prompt", { companionLine: "The orb is listening. Enter when you're ready." });
  }, [focusHomeOrb, phase]);

  const handleEnterOrb = useCallback(() => {
    if (phase !== "HOME") {
      enterLifeMap();
      return;
    }

    confirmHomeEntry();
    emitHomeEvent("home.orb.confirm", { substate: "home_confirm_enter" });
    emitHomeEvent("home.entry.prompt", { companionLine: "Crossing into your LifeMap now." });

    window.setTimeout(() => {
      enterLifeMap();
      emitHomeEvent("home.entry.commit", { nextPhase: "LIFEMAP" });
    }, 260);
  }, [confirmHomeEntry, enterLifeMap, phase]);

  const orbVisualIntensity =
    homeSubstate === "home_orb_focus" ? 0.5 : homeSubstate === "home_confirm_enter" ? 1 : 0.18;

  const skyOpacity = homeSubstate === "home_confirm_enter" ? 0.28 : homeSubstate === "home_orb_focus" ? 0.2 : 0.12;
  const avatarOpacity = homeSubstate === "home_confirm_enter" ? 0.36 : homeSubstate === "home_orb_focus" ? 0.26 : 0.2;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.52, 0.012, -0.05]} receiveShadow>
        <circleGeometry args={[1.1, 36]} />
        <shadowMaterial opacity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.4, 40]} />
        <meshBasicMaterial color="#67c4ff" transparent opacity={skyOpacity} depthWrite={false} />
      </mesh>

      <Orb interactive active onFocus={handleFocusOrb} visualIntensity={orbVisualIntensity} onClick={handleEnterOrb} />

      <mesh position={[-4.2, 1.3, -3.2]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 2.6, 0.36]} />
        <meshStandardMaterial color="#04060d" transparent opacity={avatarOpacity} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-2.8, 1.6, -5.4]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 3.2, 0.44]} />
        <meshStandardMaterial color="#04060d" transparent opacity={Math.max(0.14, avatarOpacity - 0.04)} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[3.4, 1.4, -4.8]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 2.8, 0.4]} />
        <meshStandardMaterial color="#04060d" transparent opacity={Math.max(0.16, avatarOpacity - 0.02)} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
