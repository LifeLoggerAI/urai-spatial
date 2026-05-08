"use client";

import { useEffect, useMemo, useState } from "react";
import GroundWorld from "./GroundWorld";
import HomeWorld from "./HomeWorld";
import LifeMapScene from "@/components/spatial/LifeMapScene";
import HomeParticleField from "../effects/HomeParticleField";
import ShaderSky from "../effects/ShaderSky";
import { useAudioReactivity } from "../effects/useAudioReactivity";
import { useDepthParallax } from "../effects/useDepthParallax";
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
  const parallax = useDepthParallax({ enabled: phase === "HOME" || phase === "ASCENT" });
  const audio = useAudioReactivity();

  const layers = useMemo(
    () => resolveLayerPack(phase, isTransitioning),
    [phase, isTransitioning]
  );

  const fadeMs = fadeMsFor(phase);
  const homeEffectsVisible = layers.sky.visible;

  return (
    <section
      aria-label="Spatial scene composition"
      data-phase={phase}
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        ["--urai-audio-level" as string]: audio.audioLevel.toFixed(3),
        ["--urai-bass-level" as string]: audio.bassLevel.toFixed(3),
        ["--urai-treble-level" as string]: audio.trebleLevel.toFixed(3),
      }}
    >
      {homeEffectsVisible ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            opacity: layers.sky.opacity,
            visibility: layers.sky.visible ? "visible" : "hidden",
            transition: reducedMotion ? "none" : `opacity ${fadeMs}ms ease`,
            transform: parallax.skyTransform,
            zIndex: 0,
          }}
        >
          <ShaderSky
            phase={phase}
            mood={env.mood}
            parallax={parallax}
            intensity={env.emotionalIntensity ?? 1}
          />
        </div>
      ) : null}

      {homeEffectsVisible ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            opacity: layers.sky.opacity,
            visibility: layers.sky.visible ? "visible" : "hidden",
            transition: reducedMotion ? "none" : `opacity ${fadeMs}ms ease`,
            zIndex: 1,
          }}
        >
          <HomeParticleField
            phase={phase}
            intensity={env.emotionalIntensity ?? 1}
            parallax={parallax}
            audioLevel={audio.audioLevel}
          />
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          opacity: layers.sky.opacity,
          visibility: layers.sky.visible ? "visible" : "hidden",
          transition: reducedMotion ? "none" : `opacity ${fadeMs}ms ease`,
          transform: parallax.groundTransform,
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
          position: "relative",
          zIndex: 3,
          opacity: layers.orb.opacity,
          visibility: layers.orb.visible ? "visible" : "hidden",
          transition: reducedMotion ? "none" : `opacity ${fadeMs}ms ease`,
          transform: parallax.orbTransform,
          filter: `drop-shadow(0 0 ${Math.round(18 + audio.bassLevel * 22)}px rgba(103,196,255,${0.2 + audio.audioLevel * 0.35}))`,
        }}
      >
        <HomeWorld audioLevel={audio.audioLevel} bassLevel={audio.bassLevel} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 4,
          opacity: phase === "HOME" ? 0 : 1,
          visibility: phase === "HOME" ? "hidden" : "visible",
          transition: reducedMotion ? "none" : `opacity ${fadeMs}ms ease`,
        }}
      >
        <LifeMapScene />
      </div>

      {layers.homeUiVisible ? (
        <div
          data-home-ui
          style={{
            position: "relative",
            zIndex: 5,
            opacity: 1,
            transform: parallax.navTransform,
            transition: reducedMotion ? "none" : `opacity ${fadeMs}ms ease`,
          }}
        >
          <button type="button" aria-label="Enter Life Map" onClick={() => useSceneStore.getState().enterLifeMap()}>
            Enter Life Map
          </button>
          <button
            type="button"
            aria-pressed={audio.listening}
            onClick={() => {
              if (audio.listening) audio.stop();
              else void audio.start();
            }}
          >
            {audio.listening ? "Stop reactive audio" : "Enable reactive audio"}
          </button>
        </div>
      ) : null}

      <div data-avatar-visible={layers.avatar.visible ? "true" : "false"} style={{ transform: parallax.bodyTransform }} />
    </section>
  );
}
