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
      ? 0.5
      : homeSubstate === "home_confirm_enter"
      ? 1
      : 0.18;

  const skyOpacity =
    homeSubstate === "home_confirm_enter"
      ? 0.28
      : homeSubstate === "home_orb_focus"
      ? 0.2
      : 0.12;

  const avatarOpacity =
    homeSubstate === "home_confirm_enter"
      ? 0.36
      : homeSubstate === "home_orb_focus"
      ? 0.26
      : 0.2;

  const reactiveGlow = 0.08 + bassLevel * 0.18 + audioLevel * 0.12;
  const reactiveScale = 1 + audioLevel * 0.08;

  return (
    <group scale={[reactiveScale, reactiveScale, reactiveScale]}>
      <HomeSky />

      {/* GROUND */}
      <GroundWorld
        recession={groundVisual.recession}
        elevation={groundVisual.elevation}
        opacity={groundVisual.opacity}
      />

      {/* SHADOW */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.012, -0.05]}
        receiveShadow
      >
        <circleGeometry args={[1.1, 36]} />
        <shadowMaterial opacity={0.5 + audioLevel * 0.12} />
      </mesh>

      {/* AURA */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.4 + audioLevel * 0.2, 40]} />
        <meshBasicMaterial
          color="#67c4ff"
          transparent
          opacity={Math.max(skyOpacity, reactiveGlow)}
          depthWrite={false}
        />
      </mesh>

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

      {/* AVATAR */}
      <HomeAvatar
        interactive={!disabled}
        focused={homeSubstate !== "home_idle"}
        position={[-1.08, 0.62, 0.18]}
      />

      {/* CLICK OVERLAY */}
      <Html position={[-0.52, 1.05, 0]} center>
        <button
          type="button"
          aria-label="Enter Life Map"
          disabled={busy || disabled}
          onClick={handleEnterOrb}
          style={{
            width: "8rem",
            height: "8rem",
            borderRadius: "9999px",
            border: "none",
            background: "transparent",
            opacity: 0,
            cursor: busy || disabled ? "default" : "pointer",
          }}
        />
      </Html>

      {/* CAMERA */}
      <PresenceRig
        visible={true}
        phase={phase}
        focusTarget={[-0.52, 0.38, -0.05]}
      />

      {/* DEPTH */}
      <mesh position={[-4.2, 1.3, -3.2]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 2.6, 0.36]} />
        <meshStandardMaterial
          color="#04060d"
          transparent
          opacity={avatarOpacity}
        />
      </mesh>
    </group>
  );
}