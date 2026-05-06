"use client";

import { Html } from "@react-three/drei";
import Orb from "../components/Orb";
import PresenceRig from "../components/PresenceRig";
import HomeSkyDome from "../components/HomeSkyDome";
import { useSceneStore } from "../store/useSceneStore";
import GroundWorld from "./GroundWorld";
import { getGroundChannelsForPhase } from "./phaseMachine";

type NarratorSource = "orb" | "overlay" | "pointer" | "keyboard" | "scene";

type HomeNarratorEvent = {
  event: "home.orb.activate" | "home.orb.focus" | "home.phase.context";
  source: NarratorSource;
  phase: string;
  busy: boolean;
  disabled: boolean;
  progress: number;
  context: {
    surface: "home";
    target: "lifemap";
    inputLocked: boolean;
    isTransitioning: boolean;
  };
  timestamp: number;
};

function emitHomeNarratorEvent(detail: Omit<HomeNarratorEvent, "timestamp">) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<HomeNarratorEvent>("urai:narrator", {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    }),
  );
}

export default function HomeWorld() {
  const phase = useSceneStore((s) => s.phase);
  const progress = useSceneStore((s) => s.progress);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  const inputLocked = useSceneStore((s) => s.inputLocked);
  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);

  const channels = getGroundChannelsForPhase(phase, progress);
  const busy = phase === "ASCENT" || isTransitioning || inputLocked;
  const disabled = phase !== "HOME";

  const narratorBase = {
    phase,
    busy,
    disabled,
    progress,
    context: {
      surface: "home" as const,
      target: "lifemap" as const,
      inputLocked,
      isTransitioning,
    },
  };

  const handleOrbFocus = (source: "orb" | "overlay") => {
    emitHomeNarratorEvent({
      event: "home.orb.focus",
      source,
      ...narratorBase,
    });
  };

  const handleEnterLifeMap = (source: "pointer" | "keyboard" | "overlay") => {
    if (busy || disabled) return;

    emitHomeNarratorEvent({
      event: "home.orb.activate",
      source,
      ...narratorBase,
    });

    enterLifeMap();
  };

  return (
    <group>
      <HomeSkyDome visible />

      <GroundWorld
        recession={channels.recession}
        elevation={channels.elevation}
        opacity={channels.opacity}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.52, 0.012, -0.05]} receiveShadow>
        <circleGeometry args={[1.1, 36]} />
        <shadowMaterial opacity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.4, 40]} />
        <meshBasicMaterial color="#67c4ff" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <Orb
        interactive
        active={!disabled}
        busy={busy}
        disabled={disabled}
        ariaLabel="Enter Life Map"
        onFocus={() => handleOrbFocus("orb")}
        onClick={handleEnterLifeMap}
      />

      <Html position={[-0.52, 1.05, 0]} center>
        <button
          type="button"
          aria-label="Enter Life Map"
          disabled={busy || disabled}
          onFocus={() => handleOrbFocus("overlay")}
          onClick={() => handleEnterLifeMap("overlay")}
          style={{
            width: "8rem",
            height: "8rem",
            borderRadius: "9999px",
            border: "none",
            background: "transparent",
            cursor: busy || disabled ? "not-allowed" : "pointer",
            opacity: 0,
          }}
        />
      </Html>

      <PresenceRig />

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
