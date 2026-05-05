"use client";

import { Html } from "@react-three/drei";
import Orb from "../components/Orb";
import PresenceRig from "../components/PresenceRig";
import { useSceneStore } from "../state/sceneStore";
import GroundWorld from "./GroundWorld";
import HomeSky from "./HomeSky";
import { getGroundChannelsForPhase } from "./phaseMachine";

type HomeOrbEvent =
  | {
      event: "home.orb.activate";
      source: "pointer" | "keyboard" | "overlay";
      timestamp: number;
    }
  | {
      event: "home.orb.focus";
      source: "orb" | "overlay";
      timestamp: number;
    };

function emitHomeOrbEvent(detail: Omit<HomeOrbEvent, "timestamp">) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<HomeOrbEvent>("urai:narrator", {
      detail: {
        ...detail,
        timestamp: Date.now(),
      } as HomeOrbEvent,
    })
  );
}

const easeOutCubic = (t: number) =>
  1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

export default function HomeWorld() {
  const phase = useSceneStore((s) => s.phase);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  const inputLocked = useSceneStore((s) => s.inputLocked);
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

  const handleEnterLifeMap = (source: "pointer" | "keyboard" | "overlay") => {
    if (busy || disabled) return;

    emitHomeOrbEvent({
      event: "home.orb.activate",
      source,
    });

    enterLifeMap();
  };

  return (
    <group>
      <HomeSky />

      <GroundWorld
        recession={groundVisual.recession}
        elevation={groundVisual.elevation}
        opacity={groundVisual.opacity}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.012, -0.05]}
        receiveShadow
      >
        <circleGeometry args={[1.1, 36]} />
        <shadowMaterial opacity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.4, 40]} />
        <meshBasicMaterial
          color="#67c4ff"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <Orb
        interactive
        active={!disabled}
        busy={busy}
        disabled={disabled}
        ariaLabel="Enter Life Map"
        onFocus={() =>
          emitHomeOrbEvent({
            event: "home.orb.focus",
            source: "orb",
          })
        }
        onClick={handleEnterLifeMap}
      />

      <Html position={[-0.52, 1.05, 0]} center>
        <button
          type="button"
          aria-label="Enter Life Map"
          disabled={busy || disabled}
          onFocus={() =>
            emitHomeOrbEvent({
              event: "home.orb.focus",
              source: "overlay",
            })
          }
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

      <PresenceRig visible phase={phase} focusTarget={[-0.52, 0.38, -0.05]} />

      <mesh position={[-4.2, 1.3, -3.2]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 2.6, 0.36]} />
        <meshStandardMaterial
          color="#04060d"
          transparent
          opacity={0.2}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <mesh position={[-2.8, 1.6, -5.4]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 3.2, 0.44]} />
        <meshStandardMaterial
          color="#04060d"
          transparent
          opacity={0.16}
          roughness={1}
          metalness={0}
        />
      </mesh>

      <mesh position={[3.4, 1.4, -4.8]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 2.8, 0.4]} />
        <meshStandardMaterial
          color="#04060d"
          transparent
          opacity={0.18}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  );
}