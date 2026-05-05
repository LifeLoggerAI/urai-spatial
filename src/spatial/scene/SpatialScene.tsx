"use client";

import { useEffect, useMemo, useState } from "react";
import GroundWorld from "./GroundWorld";
import HomeWorld from "./HomeWorld";
import LifeMapScene from "@/components/spatial/LifeMapScene";
import { useSceneStore, type ScenePhase } from "../state/sceneStore";
import { useEnvironmentSignal } from "../signals/environmentSignal";

// ... unchanged types

type LayerVisibility = {
  visible: boolean;
  opacity: number;
};

type LayerPack = {
  sky: LayerVisibility;
  orb: LayerVisibility;
  ground: LayerVisibility;
  avatar: LayerVisibility;
  homeUiVisible: boolean;
};

const PHASE_FADE_MS: Record<ScenePhase, number> = {
  HOME: 280,
  ASCENT: 460,
  LIFEMAP: 460,
  FOCUS: 300,
  REPLAY: 300,
};

function useReducedMotionPolicy() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return {
    reducedMotion: reduce,
    fadeMsFor: (phase: ScenePhase) => (reduce ? 0 : PHASE_FADE_MS[phase]),
  };
}

function resolveLayerPack(phase: ScenePhase, transitionActive: boolean): LayerPack {
  const inHome = phase === "HOME";
  const inAscent = phase === "ASCENT";

  const homeOpacity = inHome ? 1 : inAscent ? 0.42 : 0;

  return {
    sky: { visible: inHome || inAscent, opacity: homeOpacity },
    orb: { visible: inHome || inAscent, opacity: inHome ? 1 : 0.65 },
    ground: { visible: inHome || inAscent, opacity: homeOpacity },
    avatar: { visible: inHome, opacity: inHome ? 1 : 0 },
    homeUiVisible: inHome && !transitionActive,
  };
}

export default function SpatialScene() {
  const phase = useSceneStore((s) => s.phase);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  const { reducedMotion, fadeMsFor } = useReducedMotionPolicy();

  const env = useEnvironmentSignal();

  const layers = useMemo(
    () => resolveLayerPack(phase, isTransitioning),
    [phase, isTransitioning]
  );

  const fadeMs = fadeMsFor(phase);

  return (
    <section aria-label="Spatial scene composition" data-phase={phase}>
      <div
        style={{
          opacity: layers.sky.opacity,
          visibility: layers.sky.visible ? "visible" : "hidden",
          transition: `opacity ${fadeMs}ms ease`,
        }}
      >
        <GroundWorld
          mood={env.mood}
          presence={env.presence}
          emotionalIntensity={env.emotionalIntensity}
        />
      </div>

      <div
        style={{
          opacity: layers.orb.opacity,
          visibility: layers.orb.visible ? "visible" : "hidden",
          transition: `opacity ${fadeMs}ms ease`,
        }}
      >
        <HomeWorld />
      </div>

      <div
        style={{
          opacity: phase === "HOME" ? 0 : 1,
          visibility: phase === "HOME" ? "hidden" : "visible",
          transition: `opacity ${fadeMs}ms ease`,
        }}
      >
        <LifeMapScene />
      </div>

      {layers.homeUiVisible ? (
        <div
          data-home-ui
          style={{
            opacity: 1,
            transition: reducedMotion ? "none" : `opacity ${fadeMs}ms ease`,
          }}
        >
          <button type="button" aria-label="Enter Life Map" onClick={() => useSceneStore.getState().enterLifeMap()}>
            Enter Life Map
          </button>
        </div>
      ) : null}

      <div data-avatar-visible={layers.avatar.visible ? "true" : "false"} />
    </section>
  );
}
