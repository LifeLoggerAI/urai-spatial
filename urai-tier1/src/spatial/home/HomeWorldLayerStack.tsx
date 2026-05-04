"use client";

import type { CSSProperties } from "react";
import type { HomeWorldState } from "./homeWorldTypes";
import { homeWorldTierLabels } from "./homeWorldDefaults";

function star(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    opacity: 0.18 + (((index * 13) % 72) / 100),
    delay: ((index * 17) % 11) / 10,
  };
}

function mote(index: number) {
  return {
    x: (index * 29 + 9) % 100,
    y: 52 + ((index * 19) % 43),
    size: 2 + ((index * 7) % 5),
    delay: ((index * 23) % 17) / 3,
  };
}

const stars = Array.from({ length: 120 }, (_, index) => star(index));
const motes = Array.from({ length: 34 }, (_, index) => mote(index));

export function HomeWorldLayerStack({ state, opening, onEnter }: { state: HomeWorldState; opening: boolean; onEnter: () => void }) {
  const tierLabel = homeWorldTierLabels[state.groundTier];
  const energyStyle = {
    "--energy": `${state.energyScore / 100}`,
    "--sky-intensity": `${state.skyWeatherIntensity}`,
    "--ground-intensity": `${state.groundGrowthIntensity}`,
    "--orb-intensity": `${state.orbPulseIntensity}`,
  } as CSSProperties;

  return (
    <section className={`home-world ${opening ? "opening" : ""}`} data-testid="urai-home-scene" style={energyStyle}>
      <div className="camera-rig">
        <div className="deep-sky" data-testid="home-layer-deep-sky" />
        <div className="sky-portal" data-testid="home-layer-sky-portal" />
        <div className="aurora" data-testid="home-layer-aurora" />
        <div className="cloud cloud-a" />
        <div className="cloud cloud-b" />
        <div className="constellation-web" data-testid="home-layer-constellations" />
        <div className="stars" aria-hidden="true">
          {stars.map((s, index) => <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.opacity, animationDelay: `${s.delay}s` }} />)}
        </div>

        <div className="horizon-bloom" data-testid="urai-home-horizon" />
        <div className="horizon-mist mist-far" />
        <div className="horizon-mist mist-mid" />
        <div className="horizon-mist mist-near" />
        <div className="symbolic-threshold" data-testid="home-layer-symbolic-threshold" />
        <div className="terrain terrain-far" />
        <div className="terrain terrain-mid" />
        <div className="terrain terrain-near" />

        <div className="ground ground-back" />
        <div className="ground ground-mid" />
        <div className="ground ground-front" data-testid="urai-home-ground" />
        <div className="root-network" data-testid="home-layer-root-network" />
        <div className="bloom-field" data-testid="home-layer-bloom-field" />
        <div className="ground-grid" />
        <div className="particles" data-testid="home-layer-particles">
          {motes.map((m, index) => <i key={index} style={{ left: `${m.x}%`, top: `${m.y}%`, width: m.size, height: m.size, animationDelay: `${m.delay}s` }} />)}
        </div>

        <div className="avatar" data-testid="urai-home-avatar">
          <div className="avatar-aura" />
          <div className="avatar-head" />
          <div className="avatar-torso" />
          <div className="avatar-arm avatar-arm-left" />
          <div className="avatar-arm avatar-arm-right" />
          <div className="avatar-leg avatar-leg-left" />
          <div className="avatar-leg avatar-leg-right" />
          <div className="avatar-shadow" />
        </div>

        <button type="button" className="orb" data-testid="urai-orb-button" aria-label="Enter Life Map" onClick={onEnter} disabled={opening}>
          <span className="orb-core" />
          <span className="orb-ring ring-a" />
          <span className="orb-ring ring-b" />
          <span className="orb-glyph" />
        </button>
        <div className="orb-beam" />
        <div className="camera-path path-a" />
        <div className="camera-path path-b" />
        <div className="narrator-shimmer" data-testid="home-layer-narrator-shimmer" />
        <div className="foreground-vignette" />

        <button type="button" className="enter-label" onClick={onEnter} disabled={opening}>
          {opening ? "CAMERA LIFTING THROUGH THE SKY" : "ENTER THE SKY"}
        </button>

        <p className="caption">
          {tierLabel} / {state.moodState} / energy {Math.round(state.energyScore)}
        </p>
      </div>
    </section>
  );
}
