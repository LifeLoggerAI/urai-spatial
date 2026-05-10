"use client";

import { Html } from "@react-three/drei";
import { useCallback } from "react";
import Orb from "../components/Orb";
import PresenceRig from "../components/PresenceRig";
import HomeAvatar from "./HomeAvatar";
import { useSceneStore } from "../state/sceneStore";
import GroundWorld from "./GroundWorld";
import HomeSky from "./HomeSky";
import { getGroundChannelsForPhase } from "./phaseMachine";

/* ========================= */

function emitHomeEvent(event: string, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("urai:narrator", {
      detail: { event, ...detail, timestamp: Date.now() },
    })
  );
}

const easeOutCubic = (t: number) =>
  1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

export type HomeWorldProps = {
  audioLevel?: number;
  bassLevel?: number;
};

const HOME_ORB_POSITION: [number, number, number] = [-0.52, 1.22, -0.08];
const HOME_AVATAR_POSITION: [number, number, number] = [-0.52, 0.17, 0.34];
const HOME_FOCUS_TARGET: [number, number, number] = [-0.52, 0.82, -0.04];

/* ========================= */

export default function HomeWorld({
  audioLevel = 0,
  bassLevel = 0,
}: HomeWorldProps) {
  const phase = useSceneStore((s) => s.phase);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  const inputLocked = useSceneStore((s) => s.inputLocked);

  const homeSubstate = useSceneStore((s) => s.homeSubstate);
  const focusHomeOrb = useSceneStore((s) => s.focusHomeOrb);
  const confirmHomeEntry = useSceneStore((s) => s.confirmHomeEntry);

  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);
  const progress = useSceneStore((s) => s.progress ?? 0);
  const reducedMotion = useSceneStore((s) => s.reducedMotion ?? false);

  const channels = getGroundChannelsForPhase(phase, progress);

  const groundVisual = reducedMotion
    ? {
        recession: easeOutCubic(channels.recession),
        elevation: easeOutCubic(channels.elevation),
        opacity: easeOutCubic(channels.opacity),
      }
    : channels;

  const busy = phase === "ASCENT" || isTransitioning || inputLocked;
  const disabled = phase !== "HOME";

  /* =========================
     ORB HANDLERS
     ========================= */

  const handleFocusOrb = useCallback(() => {
    if (phase !== "HOME") return;

    focusHomeOrb();

    emitHomeEvent("home.orb.focus", {
      substate: "home_orb_focus",
    });

    emitHomeEvent("home.entry.prompt", {
      companionLine: "The orb is listening. Enter when you're ready.",
    });
  }, [focusHomeOrb, phase]);

  const handleEnterOrb = useCallback(() => {
    if (busy || disabled) return;

    confirmHomeEntry();

    emitHomeEvent("home.orb.confirm", {
      substate: "home_confirm_enter",
    });

    emitHomeEvent("home.entry.prompt", {
      companionLine: "Crossing into your LifeMap now.",
    });

    setTimeout(() => {
      enterLifeMap();
      emitHomeEvent("home.entry.commit", { nextPhase: "LIFEMAP" });
    }, 260);
  }, [confirmHomeEntry, enterLifeMap, busy, disabled]);

  /* =========================
     VISUAL STATE
     ========================= */

  const orbVisualIntensity =
    homeSubstate === "home_orb_focus"
      ? 0.64
      : homeSubstate === "home_confirm_enter"
      ? 1.18
      : 0.28;

  const skyOpacity =
    homeSubstate === "home_confirm_enter"
      ? 0.34
      : homeSubstate === "home_orb_focus"
      ? 0.24
      : 0.16;

  const reactiveGlow = 0.1 + bassLevel * 0.2 + audioLevel * 0.14;
  const reactiveScale = 1 + audioLevel * 0.055;

  return (
    <group scale={[reactiveScale, reactiveScale, reactiveScale]}>
      <HomeSky />

      <GroundWorld
        mood="calm"
        presence={homeSubstate === "home_idle" ? "idle" : "near"}
        emotionalIntensity={0.46 + Math.min(0.28, bassLevel * 0.32 + audioLevel * 0.2)}
        recession={groundVisual.recession}
        elevation={groundVisual.elevation}
        opacity={groundVisual.opacity}
      />

      {/* Orb contact shadow: locked to the same altar center as the orb. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.016, -0.05]}
        receiveShadow
      >
        <circleGeometry args={[0.94, 56]} />
        <shadowMaterial opacity={0.42 + audioLevel * 0.1} />
      </mesh>

      {/* Sacred beam from the glass-stone ground up into the orb. */}
      <mesh position={[-0.52, 0.61, -0.07]} renderOrder={4}>
        <cylinderGeometry args={[0.18, 0.5, 1.22, 48, 1, true]} />
        <meshBasicMaterial
          color="#88ddff"
          transparent
          opacity={Math.max(skyOpacity, reactiveGlow) * 0.3}
          depthWrite={false}
        />
      </mesh>

      <group position={HOME_ORB_POSITION}>
        <Orb
          interactive
          active={!disabled}
          busy={busy}
          disabled={disabled}
          ariaLabel="Enter Life Map"
          visualIntensity={orbVisualIntensity}
          onFocus={handleFocusOrb}
          onClick={handleEnterOrb}
        />
      </group>

      <HomeAvatar
        interactive={!disabled}
        focused={homeSubstate !== "home_idle"}
        position={HOME_AVATAR_POSITION}
      />

      <Html position={HOME_ORB_POSITION} center>
        <button
          type="button"
          aria-label="Enter Life Map"
          disabled={busy || disabled}
          onClick={handleEnterOrb}
          style={{
            width: "8.5rem",
            height: "8.5rem",
            borderRadius: "9999px",
            border: "none",
            background: "transparent",
            opacity: 0,
            cursor: busy || disabled ? "default" : "pointer",
          }}
        />
      </Html>

      <PresenceRig
        visible={true}
        phase={phase}
        focusTarget={HOME_FOCUS_TARGET}
      />
    </group>
  );
}
